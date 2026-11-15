import { z } from "zod";
import type { Prisma } from "@/app/generated/prisma";
import { prisma } from "@/lib/prisma";
import { cartItemsSchema } from "@/features/cart/schemas";
import { quoteCart } from "@/features/cart/server/quote-cart";
import {
  CouponError,
  normalizeCouponCode,
  validateCoupon,
} from "@/features/coupons/server/coupon-service";
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
 * Guest checkouts supply `guestToken` instead — exactly one identity required.
 */
export const createPendingOrderBaseSchema = z.object({
  userId: z.string().min(1, "User id is required").optional(),
  guestToken: z.string().min(1).max(64).optional(),
  idempotencyKey: z
    .string()
    .min(1, "Idempotency key is required")
    .max(128, "Idempotency key must be 128 characters or fewer"),
  items: cartItemsSchema,
  shipping: shippingInputSchema,
  /**
   * Single server-side coupon code. Blank input is treated as absent; the
   * code is normalized to uppercase and re-validated inside the transaction
   * before any discount is snapshotted. Browser prices are still ignored.
   */
  couponCode: z
    .string()
    .trim()
    .max(64, "Coupon code must be 64 characters or fewer")
    .optional(),
});

export const createPendingOrderInputSchema = createPendingOrderBaseSchema.refine(
  (v) => Boolean(v.userId) !== Boolean(v.guestToken),
  {
    message: "Exactly one of userId or guestToken is required",
    path: ["userId"],
  },
);

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

/**
 * Atomically consumes one coupon use inside the order transaction.
 *
 * The `maxUses` predicate is evaluated by PostgreSQL under the row lock, so
 * two concurrent checkouts cannot both take the last use (same pattern as
 * `reserveVariantStock`). Because this runs inside the order's transaction,
 * the increment commits if and only if the order does — a later failure
 * rolls both back, and idempotent retries return before reaching this.
 */
async function incrementCouponUsage(
  tx: Prisma.TransactionClient,
  code: string,
): Promise<void> {
  const affected = await tx.$executeRaw`
    UPDATE "Coupon"
    SET "usedCount" = "usedCount" + 1
    WHERE "code" = ${code} AND ("maxUses" IS NULL OR "usedCount" < "maxUses")
  `;

  if (affected !== 1) {
    throw new CouponError("Coupon usage limit has been reached.");
  }
}

async function findExistingOrderId(
  userId: string | null | undefined,
  idempotencyKey: string,
  guestToken?: string | null,
): Promise<string | null> {
  if (guestToken) {
    const existing = await prisma.order.findUnique({
      where: { guestToken_idempotencyKey: { guestToken, idempotencyKey } },
      select: { id: true },
    });
    return existing?.id ?? null;
  }
  if (!userId) return null;
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
 * 3. Atomically consume one coupon use (conditional update, last-use safe).
 * 4. Atomically reserve stock with conditional updates (last-unit safe).
 * 5. Snapshot the order (incl. discountCents/couponCode), its lines, the
 *    payment, and active reservations.
 *
 * Any failure rolls back every prior write, so no partial order or reservation
 * can survive. Browser-supplied prices are never read; totals come only from
 * `quoteCart`.
 */
export async function createPendingOrder(
  input: CreatePendingOrderInput,
): Promise<{ orderId: string }> {
  const {
    userId,
    guestToken,
    idempotencyKey,
    items,
    shipping,
    couponCode: rawCouponCode,
  } = createPendingOrderInputSchema.parse(input);
  const couponCode = rawCouponCode?.trim()
    ? normalizeCouponCode(rawCouponCode)
    : undefined;

  try {
    return await prisma.$transaction(async (tx) => {
      // Idempotent retry: return the original order without touching stock,
      // even if the catalog can no longer satisfy the same cart.
      const existing = await findOrderIdByIdempotencyKey(
        tx,
        userId ?? null,
        idempotencyKey,
        guestToken ?? null,
      );
      if (existing) {
        return { orderId: existing.id };
      }

      const quote = await quoteCart(
        items,
        tx,
        couponCode ? { couponCode } : undefined,
      );

      // An invalid/expired/exhausted code must fail loudly — never silently
      // charge the full price. Re-running validation surfaces the specific
      // reason; it always throws here because the quote applied nothing.
      if (couponCode && !quote.couponCode) {
        await validateCoupon(couponCode, quote.subtotalCents, tx);
        throw new CouponError("Coupon code is not valid.");
      }

      // A coupon that wipes the total cannot be paid: Stripe Checkout has no
      // $0 session and there is no free-order fulfillment path. Reject before
      // consuming the coupon use or holding stock, so nothing is written.
      if (quote.couponCode && quote.totalCents === 0) {
        throw new CouponError(
          "This coupon covers the full order; a minimum of $0.01 must remain",
        );
      }

      // Consume one use atomically: the conditional update fails when a
      // concurrent checkout took the last use after our validation read.
      if (quote.couponCode) {
        await incrementCouponUsage(tx, quote.couponCode);
      }

      // Reserve every line inside the transaction; a shortfall throws and
      // rolls back increments made for earlier lines.
      for (const line of quote.items) {
        await reserveVariantStock(tx, line.variantId, line.quantity);
      }

      const order = await createOrderRecord(tx, {
        userId: userId ?? null,
        guestToken: guestToken ?? null,
        idempotencyKey,
        currency: quote.currency,
        subtotalCents: quote.subtotalCents,
        shippingCents: quote.shippingCents,
        taxCents: quote.taxCents,
        totalCents: quote.totalCents,
        discountCents: quote.discountCents,
        couponCode: quote.couponCode,
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
        userId ?? null,
        idempotencyKey,
        guestToken ?? null,
      );
      if (existingOrderId) {
        return { orderId: existingOrderId };
      }
    }

    throw error;
  }
}
