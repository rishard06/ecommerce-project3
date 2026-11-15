import { prisma } from "@/lib/prisma";
import type {
  FulfillmentStatus,
  OrderDetail,
  OrderStatus,
  OrderSummary,
  PaymentStatus,
} from "../types";

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

  return toDetail(order as unknown as OrderDetailRow);
}

export interface OrderViewer {
  userId?: string | null;
  guestToken?: string | null;
}

/** Raised when cancel targets a missing order or one owned by another viewer. */
export class OrderNotFoundError extends Error {
  constructor() {
    super("Order not found.");
    this.name = "OrderNotFoundError";
  }
}

/**
 * Raised when an order's state no longer allows customer cancellation: only
 * `PENDING` + `UNFULFILLED` orders may cancel. Paid, shipped, delivered, or
 * already-cancelled orders are rejected and left untouched.
 */
export class OrderNotCancellableError extends Error {
  constructor() {
    super("This order can no longer be cancelled.");
    this.name = "OrderNotCancellableError";
  }
}

/** Audit marker for a customer-initiated cancellation. Plain string, no migration. */
export const ORDER_CANCELLED_ACTION = "ORDER_CANCELLED";

/**
 * Guest-aware viewer: authenticated users match by userId, guests match by
 * unguessable guestToken. Mismatches resolve to null (404 at page boundary).
 */
export async function getOrderForViewer(
  orderId: string,
  viewer: OrderViewer,
): Promise<OrderDetail | null> {
  if (viewer.userId) {
    const owned = await getOrderForUser(orderId, viewer.userId);
    if (owned) return owned;
  }
  if (viewer.guestToken) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, guestToken: viewer.guestToken },
      include: { items: true, payment: true },
    });
    if (!order) return null;
    return toDetail(order as unknown as OrderDetailRow);
  }
  return null;
}

/**
 * Resolves `orderId` to itself only when it belongs to `viewer`, using the
 * same ownership predicate as `getOrderForViewer`: authenticated users match
 * by `userId`, guests by their unguessable `guestToken`. Anything else
 * resolves to `null` so callers cannot distinguish a missing id from another
 * customer's order.
 */
async function findOwnedOrderId(
  orderId: string,
  viewer: OrderViewer,
): Promise<string | null> {
  if (viewer.userId) {
    const owned = await prisma.order.findFirst({
      where: { id: orderId, userId: viewer.userId },
      select: { id: true },
    });
    if (owned) return owned.id;
  }
  if (viewer.guestToken) {
    const guest = await prisma.order.findFirst({
      where: { id: orderId, guestToken: viewer.guestToken },
      select: { id: true },
    });
    if (guest) return guest.id;
  }
  return null;
}

/**
 * Cancels a customer order that is still `PENDING` + `UNFULFILLED`.
 *
 * The order, its payment, and its fulfillment all move to `CANCELLED` in one
 * transaction: every `ACTIVE` reservation is claimed `ACTIVE -> RELEASED`
 * before `ProductVariant.reserved` is decremented (nothing was sold, so
 * `onHand` is untouched), and an `ORDER_CANCELLED` audit entry records the
 * actor (`userId`, or `null` for a guest cancelling with their token). The
 * coupon snapshot (`discountCents`/`couponCode`) is preserved and coupon
 * `usedCount` is never decremented here — refunds/reversals belong to Task 13.
 *
 * Paid, shipped, delivered, or already-cancelled orders throw
 * `OrderNotCancellableError` with no writes; orders owned by another viewer
 * (or missing) throw `OrderNotFoundError`. The final order update is
 * conditional on the state observed inside the transaction, so a payment
 * webhook that wins the race leaves the cancel rejected instead of clobbering
 * a paid order.
 */
export async function cancelOrder(
  orderId: string,
  viewer: OrderViewer,
): Promise<void> {
  const ownedId = await findOwnedOrderId(orderId, viewer);

  if (!ownedId) {
    throw new OrderNotFoundError();
  }

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: ownedId },
      select: {
        status: true,
        fulfillmentStatus: true,
        reservations: {
          select: { id: true, variantId: true, quantity: true, status: true },
        },
      },
    });

    if (!order) {
      throw new OrderNotFoundError();
    }

    if (
      order.status !== "PENDING" ||
      order.fulfillmentStatus !== "UNFULFILLED"
    ) {
      throw new OrderNotCancellableError();
    }

    // A committed hold means the payment webhook already converted stock into
    // a sale; cancelling now would corrupt inventory.
    if (
      order.reservations.some(
        (reservation) => reservation.status === "COMMITTED",
      )
    ) {
      throw new OrderNotCancellableError();
    }

    // Deterministic claim order (variantId, then id) matches the payment and
    // expiry paths so concurrent workers take row locks in the same order.
    const sorted = [...order.reservations].sort(
      (left, right) =>
        left.variantId.localeCompare(right.variantId) ||
        left.id.localeCompare(right.id),
    );

    for (const reservation of sorted) {
      if (reservation.status !== "ACTIVE") {
        continue;
      }

      // The conditional claim is the idempotency boundary: a concurrent
      // payment or cleanup that already moved the row makes this return 0.
      const claimed = await tx.reservation.updateMany({
        where: { id: reservation.id, status: "ACTIVE" },
        data: { status: "RELEASED" },
      });

      if (claimed.count !== 1) {
        throw new OrderNotCancellableError();
      }

      const affected = await tx.$executeRaw`
        UPDATE "product_variant"
        SET "reserved" = "reserved" - ${reservation.quantity}
        WHERE "id" = ${reservation.variantId}
          AND "reserved" >= ${reservation.quantity}
      `;

      if (affected !== 1) {
        throw new Error("Unable to release reserved stock");
      }
    }

    await tx.payment.updateMany({
      where: { orderId: ownedId, status: "PENDING" },
      data: { status: "CANCELLED" },
    });

    const updated = await tx.order.updateMany({
      where: {
        id: ownedId,
        status: "PENDING",
        fulfillmentStatus: "UNFULFILLED",
      },
      data: { status: "CANCELLED", fulfillmentStatus: "CANCELLED" },
    });

    if (updated.count !== 1) {
      throw new OrderNotCancellableError();
    }

    await tx.orderAuditLog.create({
      data: {
        orderId: ownedId,
        actorId: viewer.userId ?? null,
        action: ORDER_CANCELLED_ACTION,
        fromStatus: "PENDING",
        toStatus: "CANCELLED",
      },
    });
  });
}

type OrderDetailRow = {
  id: string;
  createdAt: Date;
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  currency: string;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  items: Array<{
    id: string;
    variantId: string | null;
    productSlug: string;
    sku: string;
    title: string;
    unitPriceCents: number;
    quantity: number;
    lineTotalCents: number;
  }>;
  shippingFullName: string;
  shippingLine1: string;
  shippingLine2: string | null;
  shippingCity: string;
  shippingRegion: string;
  shippingPostalCode: string;
  shippingCountry: string;
  payment: {
    status: PaymentStatus;
    provider: string;
    amountCents: number;
    currency: string;
  } | null;
};

function toDetail(order: OrderDetailRow): OrderDetail {
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
