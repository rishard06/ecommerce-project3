import { prisma } from "@/lib/prisma";
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

/** Action label persisted in the immutable audit trail. */
export const FULFILLMENT_UPDATED_ACTION = "FULFILLMENT_UPDATED";

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
      select: { fulfillmentStatus: true },
    });

    if (!order) {
      throw new OrderNotFoundError();
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

export interface AdminOrderSummary {
  id: string;
  createdAt: Date;
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  customerEmail: string;
  currency: string;
  subtotalCents: number;
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
}

const adminOrderSummarySelect = {
  id: true,
  createdAt: true,
  status: true,
  fulfillmentStatus: true,
  currency: true,
  subtotalCents: true,
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
    customerEmail: order.user.email,
    currency: order.currency,
    subtotalCents: order.subtotalCents,
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
    shippingCents: order.shippingCents,
    taxCents: order.taxCents,
    totalCents: order.totalCents,
    customerEmail: order.user.email,
    items,
    shipping,
    payment: order.payment
      ? {
          status: order.payment.status,
          provider: order.payment.provider,
          amountCents: order.payment.amountCents,
          currency: order.payment.currency,
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
