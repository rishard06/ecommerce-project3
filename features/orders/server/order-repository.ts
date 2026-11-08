import type { Prisma } from "@/app/generated/prisma";
import {
  InsufficientStockError,
  type CreateOrderRecordInput,
  type CreatePaymentRecordInput,
  type CreateReservationsInput,
} from "../types";

/**
 * Reusable order persistence helpers.
 *
 * Every function takes an existing `Prisma.TransactionClient`; the checkout
 * service owns transaction boundaries so a failure in any step rolls back all
 * stock, order, payment, and reservation writes together.
 */

/** Returns the order created for a user's idempotency key, with its items. */
export async function findOrderIdByIdempotencyKey(
  tx: Prisma.TransactionClient,
  userId: string,
  idempotencyKey: string,
) {
  return tx.order.findUnique({
    where: { userId_idempotencyKey: { userId, idempotencyKey } },
    include: { items: true },
  });
}

/**
 * Atomically increments `reserved` only when the available quantity
 * (`onHand - reserved`) still covers the request. The condition is evaluated
 * by PostgreSQL under the row lock, so two concurrent buyers cannot both take
 * the last unit.
 */
export async function reserveVariantStock(
  tx: Prisma.TransactionClient,
  variantId: string,
  quantity: number,
): Promise<void> {
  const affected = await tx.$executeRaw`
    UPDATE "product_variant"
    SET "reserved" = "reserved" + ${quantity}
    WHERE "id" = ${variantId} AND ("onHand" - "reserved") >= ${quantity}
  `;

  if (affected !== 1) {
    throw new InsufficientStockError(variantId);
  }
}

/** Creates a pending order together with immutable nested line snapshots. */
export async function createOrderRecord(
  tx: Prisma.TransactionClient,
  input: CreateOrderRecordInput,
) {
  return tx.order.create({
    data: {
      userId: input.userId,
      status: "PENDING",
      fulfillmentStatus: "UNFULFILLED",
      currency: input.currency,
      subtotalCents: input.subtotalCents,
      shippingCents: input.shippingCents,
      taxCents: input.taxCents,
      totalCents: input.totalCents,
      shippingFullName: input.shipping.fullName,
      shippingLine1: input.shipping.line1,
      shippingLine2: input.shipping.line2 ?? null,
      shippingCity: input.shipping.city,
      shippingRegion: input.shipping.region,
      shippingPostalCode: input.shipping.postalCode,
      shippingCountry: input.shipping.country,
      idempotencyKey: input.idempotencyKey,
      items: {
        create: input.items.map((item) => ({
          variantId: item.variantId,
          productSlug: item.productSlug,
          sku: item.sku,
          title: item.title,
          unitPriceCents: item.unitPriceCents,
          quantity: item.quantity,
          lineTotalCents: item.lineTotalCents,
        })),
      },
    },
  });
}

/** Creates the single pending payment row for an order. */
export async function createPaymentRecord(
  tx: Prisma.TransactionClient,
  input: CreatePaymentRecordInput,
) {
  return tx.payment.create({
    data: {
      orderId: input.orderId,
      status: input.status ?? "PENDING",
      provider: input.provider ?? "stripe",
      amountCents: input.amountCents,
      currency: input.currency,
    },
  });
}

/** Creates one active reservation per quoted cart line. */
export async function createReservations(
  tx: Prisma.TransactionClient,
  input: CreateReservationsInput,
) {
  return tx.reservation.createMany({
    data: input.items.map((item) => ({
      orderId: input.orderId,
      variantId: item.variantId,
      quantity: item.quantity,
      status: "ACTIVE" as const,
      expiresAt: input.expiresAt,
    })),
  });
}
