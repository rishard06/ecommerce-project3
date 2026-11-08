import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { cartItemsSchema } from "@/features/cart/schemas";
import { quoteCart } from "@/features/cart/server/quote-cart";
import { InsufficientStockError } from "@/features/orders/types";
import {
  createOrderRecord,
  createPaymentRecord,
  createReservations,
  findOrderIdByIdempotencyKey,
  reserveVariantStock,
} from "@/features/orders/server/order-repository";

export { InsufficientStockError };

/** Stock is held for 30 minutes before Task 12 can reclaim it. */
const RESERVATION_TTL_MS = 30 * 60 * 1000;

/**
 * Shipping snapshot captured with the order. `z.object` strips unknown
 * browser fields; required values are stored verbatim.
 */
export const shippingInputSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  line1: z.string().min(1, "Address line 1 is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  region: z.string().min(1, "Region is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
});

/**
 * Full checkout input. `userId` is supplied by the authenticated server
 * context, never by the browser; the cart schema strips any price/title fields.
 */
export const createPendingOrderInputSchema = z.object({
  userId: z.string().min(1, "User id is required"),
  idempotencyKey: z
    .string()
    .min(1, "Idempotency key is required")
    .max(128, "Idempotency key must be 128 characters or fewer"),
  items: cartItemsSchema,
  shipping: shippingInputSchema,
});

export type CreatePendingOrderInput = z.infer<
  typeof createPendingOrderInputSchema
>;

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

async function findExistingOrderId(
  userId: string,
  idempotencyKey: string,
): Promise<string | null> {
  const existing = await prisma.order.findUnique({
    where: { userId_idempotencyKey: { userId, idempotencyKey } },
    select: { id: true },
  });

  return existing?.id ?? null;
}

/**
 * Creates a pending order in one transaction:
 *
 * 1. Return an existing order for a repeated user-scoped idempotency key.
 * 2. Quote the cart from the database inside the same transaction.
 * 3. Atomically reserve stock with conditional updates (last-unit safe).
 * 4. Snapshot the order, its lines, the payment, and active reservations.
 *
 * Any failure rolls back every prior write, so no partial order or reservation
 * can survive. Browser-supplied prices are never read; totals come only from
 * `quoteCart`.
 */
export async function createPendingOrder(
  input: CreatePendingOrderInput,
): Promise<{ orderId: string }> {
  const { userId, idempotencyKey, items, shipping } =
    createPendingOrderInputSchema.parse(input);

  try {
    return await prisma.$transaction(async (tx) => {
      // Idempotent retry: return the original order without touching stock,
      // even if the catalog can no longer satisfy the same cart.
      const existing = await findOrderIdByIdempotencyKey(
        tx,
        userId,
        idempotencyKey,
      );
      if (existing) {
        return { orderId: existing.id };
      }

      const quote = await quoteCart(items, tx);

      // Reserve every line inside the transaction; a shortfall throws and
      // rolls back increments made for earlier lines.
      for (const line of quote.items) {
        await reserveVariantStock(tx, line.variantId, line.quantity);
      }

      const order = await createOrderRecord(tx, {
        userId,
        idempotencyKey,
        currency: quote.currency,
        subtotalCents: quote.subtotalCents,
        shippingCents: quote.shippingCents,
        taxCents: quote.taxCents,
        totalCents: quote.totalCents,
        shipping,
        items: quote.items,
      });

      await createPaymentRecord(tx, {
        orderId: order.id,
        amountCents: quote.totalCents,
        currency: "USD",
      });

      await createReservations(tx, {
        orderId: order.id,
        expiresAt: new Date(Date.now() + RESERVATION_TTL_MS),
        items: quote.items.map((line) => ({
          variantId: line.variantId,
          quantity: line.quantity,
        })),
      });

      return { orderId: order.id };
    });
  } catch (error) {
    // Concurrent duplicate requests both miss the initial idempotency lookup.
    // The loser gets P2002 from the unique constraint (or runs out of stock
    // after the winner commits); in either case the winner's order is the
    // authoritative result.
    if (
      isUniqueConstraintError(error) ||
      error instanceof InsufficientStockError
    ) {
      const existingOrderId = await findExistingOrderId(
        userId,
        idempotencyKey,
      );
      if (existingOrderId) {
        return { orderId: existingOrderId };
      }
    }

    throw error;
  }
}
