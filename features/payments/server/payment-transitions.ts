import type { Prisma } from "@/app/generated/prisma";
import { prisma } from "@/lib/prisma";

/**
 * Payment/order transition failure that is safe to log. It never contains
 * secret values or customer data.
 */
export class PaymentTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentTransitionError";
  }
}

/** The shared Prisma client or the client of an interactive transaction. */
type TransitionClient = Prisma.TransactionClient;

/**
 * Audit markers written when a paid checkout cannot be honored. They are plain
 * strings (not a schema enum), so an audit write needs no migration.
 */
export const PAYMENT_AFTER_RELEASE_ACTION = "PAYMENT_AFTER_RELEASE";
export const PAYMENT_AFTER_CANCELLATION_ACTION = "PAYMENT_AFTER_CANCELLATION";

/**
 * Deterministic claim order shared with `releaseExpiredReservations`:
 * `variantId` ascending, then reservation id. All three paths (pay, expiry,
 * cleanup) therefore take row locks in the same order, which removes the
 * deadlock window on multi-variant orders.
 */
export function sortReservationsForClaim<
  T extends { variantId: string; id: string },
>(reservations: T[]): T[] {
  return [...reservations].sort(
    (left, right) =>
      left.variantId.localeCompare(right.variantId) ||
      left.id.localeCompare(right.id),
  );
}

/**
 * Converts an active stock hold into a sale.
 *
 * Each reservation is claimed with a conditional `ACTIVE → COMMITTED` update
 * before any stock moves. The row lock makes a concurrent cleanup (which claims
 * `ACTIVE → RELEASED`) lose deterministically: only the winner mutates stock.
 * The order and payment updates are likewise status-guarded, so a payment can
 * never be recorded on a cancelled order or resurrect a cancelled payment.
 *
 * The order remains `UNFULFILLED` — fulfillment is a separate concern that a
 * payment webhook must never advance. Repeated calls for an already-paid order
 * remain successful no-ops.
 */
export async function markCheckoutPaid(
  orderId: string,
  sessionId: string,
  db: TransitionClient = prisma,
): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { reservations: true },
  });

  if (!order) {
    return;
  }

  // A replay for an already-paid order is an idempotent no-op.
  if (order.status === "PAID") {
    return;
  }

  // Payment arrived after cancellation (expired checkout or cleanup). The
  // customer may still have been charged, so leave a durable, secret-free
  // marker for manual refund/reconciliation instead of silently returning.
  if (order.status !== "PENDING") {
    console.warn(
      `[payments] checkout completed for cancelled order ${orderId}; manual refund/reconciliation required`,
    );
    await db.orderAuditLog.create({
      data: {
        orderId,
        actorId: null,
        action: PAYMENT_AFTER_CANCELLATION_ACTION,
        fromStatus: order.status,
        toStatus: order.status,
      },
    });
    return;
  }

  const reservations = sortReservationsForClaim(order.reservations);
  if (
    reservations.length > 0 &&
    reservations.every((reservation) => reservation.status === "COMMITTED")
  ) {
    return;
  }

  // Cleanup already reclaimed this hold. Payment arrived too late for the
  // reservation; leave the order for cleanup/manual refund rather than paying
  // stock that is gone.
  if (reservations.some((reservation) => reservation.status === "RELEASED")) {
    console.warn(
      `[payments] checkout completed after reservation release for order ${orderId}; manual refund/reconciliation required`,
    );
    await db.orderAuditLog.create({
      data: {
        orderId,
        actorId: null,
        action: PAYMENT_AFTER_RELEASE_ACTION,
        fromStatus: order.status,
        toStatus: order.status,
      },
    });
    return;
  }

  for (const reservation of reservations) {
    if (reservation.status !== "ACTIVE") {
      continue;
    }

    // Claim first. If another worker transitioned the reservation after it was
    // read, this returns 0 and the caller's transaction rolls back; Stripe then
    // retries and observes the winner's committed state.
    const claimed = await db.reservation.updateMany({
      where: { id: reservation.id, status: "ACTIVE" },
      data: { status: "COMMITTED" },
    });

    if (claimed.count !== 1) {
      throw new PaymentTransitionError(
        "Unable to claim reservation for payment",
      );
    }

    const affected = await db.$executeRaw`
      UPDATE "product_variant"
      SET "onHand" = "onHand" - ${reservation.quantity},
          "reserved" = "reserved" - ${reservation.quantity}
      WHERE "id" = ${reservation.variantId}
        AND "onHand" >= ${reservation.quantity}
        AND "reserved" >= ${reservation.quantity}
    `;

    if (affected !== 1) {
      throw new PaymentTransitionError("Unable to commit reserved stock");
    }
  }

  const payment = await db.payment.findUnique({
    where: { orderId },
    select: { providerSessionId: true },
  });

  const paymentUpdated = await db.payment.updateMany({
    where: { orderId, status: "PENDING" },
    data: {
      status: "SUCCEEDED",
      ...(payment?.providerSessionId ? {} : { providerSessionId: sessionId }),
    },
  });

  if (paymentUpdated.count === 0) {
    const currentPayment = await db.payment.findUnique({
      where: { orderId },
      select: { status: true },
    });

    // An already-succeeded payment is an idempotent no-op; any other status
    // (notably CANCELLED) must never be overwritten with success.
    if (currentPayment?.status !== "SUCCEEDED") {
      throw new PaymentTransitionError("Unable to mark payment succeeded");
    }
  }

  const orderUpdated = await db.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: { status: "PAID" },
  });

  if (orderUpdated.count !== 1) {
    throw new PaymentTransitionError("Unable to mark order paid");
  }
}

/**
 * Returns every active stock hold without touching physical stock.
 *
 * Each reservation is claimed with a conditional `ACTIVE → RELEASED` update
 * before `reserved` is decremented, so a concurrent payment wins or loses
 * cleanly instead of both decrementing the same hold. Only `reserved` changes;
 * `onHand` is untouched because nothing was sold. Already-paid or
 * already-cancelled orders remain successful no-ops.
 */
export async function releaseCheckout(
  orderId: string,
  db: TransitionClient = prisma,
): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { reservations: true },
  });

  if (!order || order.status !== "PENDING") {
    return;
  }

  for (const reservation of sortReservationsForClaim(order.reservations)) {
    if (reservation.status !== "ACTIVE") {
      continue;
    }

    const claimed = await db.reservation.updateMany({
      where: { id: reservation.id, status: "ACTIVE" },
      data: { status: "RELEASED" },
    });

    if (claimed.count !== 1) {
      throw new PaymentTransitionError(
        "Unable to claim reservation for release",
      );
    }

    const affected = await db.$executeRaw`
      UPDATE "product_variant"
      SET "reserved" = "reserved" - ${reservation.quantity}
      WHERE "id" = ${reservation.variantId}
        AND "reserved" >= ${reservation.quantity}
    `;

    if (affected !== 1) {
      throw new PaymentTransitionError("Unable to release reserved stock");
    }
  }

  await db.payment.updateMany({
    where: { orderId, status: "PENDING" },
    data: { status: "CANCELLED" },
  });

  const orderUpdated = await db.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: { status: "CANCELLED" },
  });

  if (orderUpdated.count !== 1) {
    throw new PaymentTransitionError("Unable to cancel order");
  }
}
