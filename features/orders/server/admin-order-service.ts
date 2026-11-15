import { prisma } from "@/lib/prisma";
import { getStripe } from "@/features/payments/server/stripe-client";
import type {
  FulfillmentStatus,
  OrderDetail,
  OrderItemSnapshot,
  OrderStatus,
  PaymentStatus,
  ShippingSnapshot,
} from "../types";

/**
 * Admin order queries and guarded fulfillment transitions.
 *
 * Nothing in this module authorizes the caller. Every exported mutation and
 * read is only exposed through server actions/pages that call `requireAdmin()`
 * first; the service itself has no customer-scoped variant.
 */

/** Raised when a fulfillment change would create an impossible history. */
export class InvalidFulfillmentTransitionError extends Error {
  readonly from: FulfillmentStatus;
  readonly to: FulfillmentStatus;

  constructor(from: FulfillmentStatus, to: FulfillmentStatus) {
    super(`Cannot change fulfillment status from ${from} to ${to}.`);
    this.name = "InvalidFulfillmentTransitionError";
    this.from = from;
    this.to = to;
  }
}

/** Raised when a fulfillment change targets an order that does not exist. */
export class OrderNotFoundError extends Error {
  constructor() {
    super("Order not found.");
    this.name = "OrderNotFoundError";
  }
}

/**
 * Raised when an admin refund cannot proceed. The message is safe to show to
 * the admin: it never contains provider secrets or customer data.
 */
export class OrderNotRefundableError extends Error {
  constructor(message = "This order cannot be refunded.") {
    super(message);
    this.name = "OrderNotRefundableError";
  }
}

/** Action label persisted in the immutable audit trail. */
export const FULFILLMENT_UPDATED_ACTION = "FULFILLMENT_UPDATED";

/** Audit marker for an admin-initiated refund + cancellation. Plain string. */
export const ORDER_REFUNDED_ACTION = "ORDER_REFUNDED";

/**
 * The only forward edges of the linear state machine. Cancellation is handled
 * separately because it is an explicit terminal branch, not part of the
 * linear progression.
 */
const LINEAR_NEXT: Partial<Record<FulfillmentStatus, FulfillmentStatus>> = {
  UNFULFILLED: "PROCESSING",
  PROCESSING: "SHIPPED",
  SHIPPED: "DELIVERED",
};

/** True when `to` is the next linear step or a legal explicit cancellation. */
export function isFulfillmentTransitionAllowed(
  from: FulfillmentStatus,
  to: FulfillmentStatus,
): boolean {
  if (to === "CANCELLED") {
    return from === "UNFULFILLED" || from === "PROCESSING";
  }

  return LINEAR_NEXT[from] === to;
}

/**
 * Every transition an admin may take from `current`, in display order.
 * `DELIVERED` and `CANCELLED` are terminal, so they return an empty list.
 */
export function allowedFulfillmentTransitions(
  current: FulfillmentStatus,
): FulfillmentStatus[] {
  const transitions: FulfillmentStatus[] = [];
  const linear = LINEAR_NEXT[current];

  if (linear) {
    transitions.push(linear);
  }

  if (current === "UNFULFILLED" || current === "PROCESSING") {
    transitions.push("CANCELLED");
  }

  return transitions;
}

/**
 * The transitions the admin detail page may render for an order. A
 * `CANCELLED` order is terminal at the service layer
 * (`updateFulfillment` rejects every transition on it), so the page renders
 * no buttons instead of controls that always fail silently.
 */
export function visibleFulfillmentTransitions(order: {
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
}): FulfillmentStatus[] {
  if (order.status === "CANCELLED") {
    return [];
  }

  return allowedFulfillmentTransitions(order.fulfillmentStatus);
}

/**
 * Applies one explicit fulfillment transition.
 *
 * The order row and its audit entry are written in a single transaction. The
 * update is conditional on the status observed inside that transaction, so two
 * concurrent admins cannot both commit a transition from the same state.
 *
 * Payment status and `Order.status` are intentionally never touched: Stripe
 * webhooks remain the only payment truth.
 */
export async function updateFulfillment(
  orderId: string,
  next: FulfillmentStatus,
  actorId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { status: true, fulfillmentStatus: true },
    });

    if (!order) {
      throw new OrderNotFoundError();
    }

    // Terminal orders never move again. This accepts both cancelled shapes —
    // legacy expiry rows (CANCELLED + UNFULFILLED) and full cancels
    // (CANCELLED + CANCELLED) — and refuses to ship either. PAID orders stay
    // fulfillable: advancing a paid order is the core admin flow.
    if (order.status === "CANCELLED") {
      throw new InvalidFulfillmentTransitionError(order.fulfillmentStatus, next);
    }

    const current = order.fulfillmentStatus;

    if (!isFulfillmentTransitionAllowed(current, next)) {
      throw new InvalidFulfillmentTransitionError(current, next);
    }

    const affected = await tx.order.updateMany({
      where: { id: orderId, fulfillmentStatus: current },
      data: { fulfillmentStatus: next },
    });

    if (affected.count !== 1) {
      throw new InvalidFulfillmentTransitionError(current, next);
    }

    await tx.orderAuditLog.create({
      data: {
        orderId,
        actorId,
        action: FULFILLMENT_UPDATED_ACTION,
        fromStatus: current,
        toStatus: next,
      },
    });
  });
}

interface RefundableOrderState {
  status: string;
  fulfillmentStatus: string;
  payment: {
    status: string;
    provider: string;
    providerPaymentIntentId: string | null;
  } | null;
}

/**
 * Fulfillment states that may still be refunded. `CANCELLED` is included:
 * cancelling fulfillment is only legal from `UNFULFILLED`/`PROCESSING`, so a
 * `PAID` order with cancelled fulfillment was never shipped and the money is
 * otherwise stranded.
 */
const REFUNDABLE_FULFILLMENT_STATUSES: FulfillmentStatus[] = [
  "UNFULFILLED",
  "PROCESSING",
  "CANCELLED",
];

/**
 * The single refund gate shared by the service and the admin refund card.
 * Returns the admin-facing block reason, or `null` when the order may be
 * refunded: `PAID` + unshipped fulfillment + a succeeded Stripe payment
 * intent. `REFUNDED` payments never re-pass (status is no longer `SUCCEEDED`).
 */
export function refundBlockReason(order: RefundableOrderState): string | null {
  if (order.status !== "PAID") {
    return "Only paid orders can be refunded.";
  }
  if (
    !REFUNDABLE_FULFILLMENT_STATUSES.includes(
      order.fulfillmentStatus as FulfillmentStatus,
    )
  ) {
    return "Only unfulfilled or processing orders can be refunded.";
  }
  if (!order.payment || order.payment.status !== "SUCCEEDED") {
    return "Only orders with a succeeded payment can be refunded.";
  }
  if (
    order.payment.provider !== "stripe" ||
    !order.payment.providerPaymentIntentId
  ) {
    return "Only orders with a Stripe payment intent can be refunded.";
  }
  return null;
}

/**
 * Shared predicate used by both the refund service gate and the admin page's
 * refund card, so the card cannot outlive the guard.
 */
export function canRefund(order: RefundableOrderState): boolean {
  return refundBlockReason(order) === null;
}

/**
 * Throws `OrderNotRefundableError` with an admin-facing message when the
 * observed state must never reach Stripe. Only PAID, unshipped orders with a
 * succeeded Stripe payment intent may be refunded: PENDING, zero-total (which
 * never becomes PAID), intent-less, and already-fulfilled rows all stop here.
 */
function assertRefundable(order: RefundableOrderState): asserts order is RefundableOrderState & {
  payment: { status: string; provider: string; providerPaymentIntentId: string };
} {
  const reason = refundBlockReason(order);
  if (reason) {
    throw new OrderNotRefundableError(reason);
  }
}

/**
 * Refunds a paid order in full and cancels it.
 *
 * Stripe is called first with `idempotencyKey: refund-{orderId}`; the order,
 * payment, reservations, coupon usage, and audit row then commit in one
 * transaction. If the transaction fails after a successful refund, a retry
 * reuses the same idempotency key, so Stripe returns the original refund
 * instead of issuing a second one. An already-cancelled order is an
 * idempotent no-op that never touches Stripe.
 *
 * Reservation reversal mirrors the Task 12 pattern: ACTIVE holds are claimed
 * ACTIVE → RELEASED before `reserved` is decremented (nothing was sold, so
 * `onHand` is untouched), while COMMITTED holds had their sale recorded by
 * the payment webhook, so the refund restocks `onHand` instead. Coupon usage
 * is returned (`usedCount - 1`, floored at zero): unlike the customer
 * self-service cancel, which keeps the use consumed as an abuse guard, the
 * trusted admin path voids the order completely and must not permanently
 * burn a limited coupon.
 *
 * Returns `{ refunded: true }` when a refund was issued and `{ refunded:
 * false }` when the order was already cancelled.
 */
export async function refundPayment(
  orderId: string,
  actorId: string,
): Promise<{ refunded: boolean }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      status: true,
      fulfillmentStatus: true,
      payment: {
        select: {
          status: true,
          provider: true,
          providerPaymentIntentId: true,
        },
      },
    },
  });

  if (!order) {
    throw new OrderNotFoundError();
  }

  if (order.status === "CANCELLED") {
    return { refunded: false };
  }

  assertRefundable(order);

  await getStripe().refunds.create(
    { payment_intent: order.payment.providerPaymentIntentId },
    { idempotencyKey: `refund-${orderId}` },
  );

  await prisma.$transaction(async (tx) => {
    const current = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        status: true,
        fulfillmentStatus: true,
        couponCode: true,
        reservations: {
          select: { id: true, variantId: true, quantity: true, status: true },
        },
      },
    });

    if (!current) {
      throw new OrderNotFoundError();
    }

    // A concurrent admin refund that won the race already cancelled the row;
    // the Stripe call above is idempotent, so losing here is safe. Cancelled
    // fulfillment stays refundable (it was never shipped); only shipped or
    // delivered rows are stranded from this path.
    if (
      current.status !== "PAID" ||
      !REFUNDABLE_FULFILLMENT_STATUSES.includes(
        current.fulfillmentStatus as FulfillmentStatus,
      )
    ) {
      throw new OrderNotRefundableError(
        "This order changed while the refund was processed.",
      );
    }

    // Deterministic claim order (variantId, then id) matches the payment and
    // expiry paths so concurrent workers take row locks in the same order.
    const sorted = [...current.reservations].sort(
      (left, right) =>
        left.variantId.localeCompare(right.variantId) ||
        left.id.localeCompare(right.id),
    );

    for (const reservation of sorted) {
      if (reservation.status === "RELEASED") {
        continue;
      }

      // The conditional claim is the idempotency boundary: a concurrent
      // worker that already moved the row makes this return 0.
      const claimed = await tx.reservation.updateMany({
        where: { id: reservation.id, status: reservation.status },
        data: { status: "RELEASED" },
      });

      if (claimed.count !== 1) {
        throw new OrderNotRefundableError(
          "This order changed while the refund was processed.",
        );
      }

      if (reservation.status === "ACTIVE") {
        const affected = await tx.$executeRaw`
          UPDATE "product_variant"
          SET "reserved" = "reserved" - ${reservation.quantity}
          WHERE "id" = ${reservation.variantId}
            AND "reserved" >= ${reservation.quantity}
        `;

        if (affected !== 1) {
          throw new Error("Unable to release reserved stock");
        }
      } else {
        const affected = await tx.$executeRaw`
          UPDATE "product_variant"
          SET "onHand" = "onHand" + ${reservation.quantity}
          WHERE "id" = ${reservation.variantId}
        `;

        if (affected !== 1) {
          throw new Error("Unable to restock refunded items");
        }
      }
    }

    // A refund is recorded as REFUNDED, never CANCELLED: CANCELLED means the
    // hold expired and no money moved, while REFUNDED means captured money
    // was returned. The webhook only ever advances PENDING rows, so it can
    // neither overwrite nor resurrect a refund.
    const paymentUpdated = await tx.payment.updateMany({
      where: { orderId, status: "SUCCEEDED" },
      data: { status: "REFUNDED" },
    });

    if (paymentUpdated.count !== 1) {
      throw new OrderNotRefundableError(
        "This order changed while the refund was processed.",
      );
    }

    if (current.couponCode) {
      await tx.$executeRaw`
        UPDATE "Coupon"
        SET "usedCount" = "usedCount" - 1
        WHERE "code" = ${current.couponCode} AND "usedCount" > 0
      `;
    }

    const orderUpdated = await tx.order.updateMany({
      where: {
        id: orderId,
        status: "PAID",
        fulfillmentStatus: { in: REFUNDABLE_FULFILLMENT_STATUSES },
      },
      data: { status: "CANCELLED", fulfillmentStatus: "CANCELLED" },
    });

    if (orderUpdated.count !== 1) {
      throw new OrderNotRefundableError(
        "This order changed while the refund was processed.",
      );
    }

    await tx.orderAuditLog.create({
      data: {
        orderId,
        actorId,
        action: ORDER_REFUNDED_ACTION,
        fromStatus: "PAID",
        toStatus: "CANCELLED",
      },
    });
  });

  return { refunded: true };
}

export interface AdminOrderSummary {
  id: string;
  createdAt: Date;
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  customerEmail: string;
  currency: string;
  subtotalCents: number;
  discountCents: number;
  couponCode: string | null;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  paymentStatus: PaymentStatus | null;
}

export interface OrderAuditEntry {
  id: string;
  actorId: string | null;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  createdAt: Date;
}

export interface AdminOrderDetail extends OrderDetail {
  customerEmail: string;
  auditLogs: OrderAuditEntry[];
  payment:
    | (OrderDetail["payment"] & {
        /** Present so the page can use the shared `canRefund` gate. */
        providerPaymentIntentId: string | null;
      })
    | null;
}

const adminOrderSummarySelect = {
  id: true,
  createdAt: true,
  status: true,
  fulfillmentStatus: true,
  currency: true,
  subtotalCents: true,
  discountCents: true,
  couponCode: true,
  shippingCents: true,
  taxCents: true,
  totalCents: true,
  user: { select: { email: true } },
  payment: { select: { status: true } },
} as const;

/** Lists every customer's orders, newest first. Admin-only at the boundary. */
export async function listOrdersForAdmin(): Promise<AdminOrderSummary[]> {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    select: adminOrderSummarySelect,
  });

  return orders.map((order) => ({
    id: order.id,
    createdAt: order.createdAt,
    status: order.status,
    fulfillmentStatus: order.fulfillmentStatus,
    customerEmail: order.user?.email ?? "guest",
    currency: order.currency,
    subtotalCents: order.subtotalCents,
    discountCents: order.discountCents,
    couponCode: order.couponCode,
    shippingCents: order.shippingCents,
    taxCents: order.taxCents,
    totalCents: order.totalCents,
    paymentStatus: order.payment?.status ?? null,
  }));
}

/**
 * Loads one order with its immutable snapshots, payment, and chronological
 * audit history. Admin-only at the boundary; a missing id returns `null`.
 */
export async function getOrderForAdmin(
  orderId: string,
): Promise<AdminOrderDetail | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { email: true } },
      items: true,
      payment: true,
      auditLogs: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) {
    return null;
  }

  const items: OrderItemSnapshot[] = order.items.map((item) => ({
    id: item.id,
    variantId: item.variantId,
    productSlug: item.productSlug,
    sku: item.sku,
    title: item.title,
    unitPriceCents: item.unitPriceCents,
    quantity: item.quantity,
    lineTotalCents: item.lineTotalCents,
  }));

  const shipping: ShippingSnapshot = {
    fullName: order.shippingFullName,
    line1: order.shippingLine1,
    line2: order.shippingLine2,
    city: order.shippingCity,
    region: order.shippingRegion,
    postalCode: order.shippingPostalCode,
    country: order.shippingCountry,
  };

  return {
    id: order.id,
    createdAt: order.createdAt,
    status: order.status,
    fulfillmentStatus: order.fulfillmentStatus,
    currency: order.currency,
    subtotalCents: order.subtotalCents,
    discountCents: order.discountCents,
    couponCode: order.couponCode,
    shippingCents: order.shippingCents,
    taxCents: order.taxCents,
    totalCents: order.totalCents,
    customerEmail: order.user?.email ?? "guest",
    items,
    shipping,
    payment: order.payment
      ? {
          status: order.payment.status,
          provider: order.payment.provider,
          amountCents: order.payment.amountCents,
          currency: order.payment.currency,
          providerPaymentIntentId: order.payment.providerPaymentIntentId,
        }
      : null,
    auditLogs: order.auditLogs.map((entry) => ({
      id: entry.id,
      actorId: entry.actorId,
      action: entry.action,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      createdAt: entry.createdAt,
    })),
  };
}
