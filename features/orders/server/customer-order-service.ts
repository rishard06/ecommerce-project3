import { prisma } from "@/lib/prisma";
import type { OrderDetail, OrderSummary } from "../types";

/**
 * Customer-facing, read-only order queries.
 *
 * Ownership is part of the SQL predicate for every lookup. Callers never fetch
 * an order by id and filter afterwards, so another customer's order can only
 * ever resolve to `null` (and therefore a 404 at the page boundary).
 */

const orderSummarySelect = {
  id: true,
  createdAt: true,
  status: true,
  fulfillmentStatus: true,
  currency: true,
  subtotalCents: true,
  shippingCents: true,
  taxCents: true,
  totalCents: true,
} as const;

/** Lists the signed-in customer's orders, newest first. */
export async function listOrdersForUser(
  userId: string,
): Promise<OrderSummary[]> {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: orderSummarySelect,
  });
}

/**
 * Returns one order together with its immutable snapshots only when the order
 * belongs to `userId`. A missing id and another customer's id are
 * indistinguishable to the caller.
 */
export async function getOrderForUser(
  orderId: string,
  userId: string,
): Promise<OrderDetail | null> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: {
      items: true,
      payment: true,
    },
  });

  if (!order) {
    return null;
  }

  return {
    id: order.id,
    createdAt: order.createdAt,
    status: order.status,
    fulfillmentStatus: order.fulfillmentStatus,
    currency: order.currency,
    subtotalCents: order.subtotalCents,
    shippingCents: order.shippingCents,
    taxCents: order.taxCents,
    totalCents: order.totalCents,
    items: order.items.map((item) => ({
      id: item.id,
      variantId: item.variantId,
      productSlug: item.productSlug,
      sku: item.sku,
      title: item.title,
      unitPriceCents: item.unitPriceCents,
      quantity: item.quantity,
      lineTotalCents: item.lineTotalCents,
    })),
    shipping: {
      fullName: order.shippingFullName,
      line1: order.shippingLine1,
      line2: order.shippingLine2,
      city: order.shippingCity,
      region: order.shippingRegion,
      postalCode: order.shippingPostalCode,
      country: order.shippingCountry,
    },
    payment: order.payment
      ? {
          status: order.payment.status,
          provider: order.payment.provider,
          amountCents: order.payment.amountCents,
          currency: order.payment.currency,
        }
      : null,
  };
}
