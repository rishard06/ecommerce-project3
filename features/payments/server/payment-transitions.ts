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
 * Converts an active stock hold into a sale.
 *
 * For every `ACTIVE` reservation the guarded update decrements both `onHand`
 * and `reserved`; the row lock makes committing the same stock twice
 * impossible. The order remains `UNFULFILLED` — fulfillment is a separate
 * concern that a payment webhook must never advance.
 *
 * Repeated calls are safe: an already-paid order, or an order whose
 * reservations are all committed, is left unchanged.
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

  if (!order || order.status !== "PENDING") {
    return;
  }

  const reservations = order.reservations;
  if (
    reservations.length > 0 &&
    reservations.every((reservation) => reservation.status === "COMMITTED")
  ) {
    return;
  }

  for (const reservation of reservations) {
    if (reservation.status !== "ACTIVE") {
      continue;
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

    await db.reservation.update({
      where: { id: reservation.id },
      data: { status: "COMMITTED" },
    });
  }

  const payment = await db.payment.findUnique({
    where: { orderId },
    select: { providerSessionId: true },
  });

  await db.payment.updateMany({
    where: { orderId },
    data: {
      status: "SUCCEEDED",
      ...(payment?.providerSessionId ? {} : { providerSessionId: sessionId }),
    },
  });

  await db.order.update({
    where: { id: orderId },
    data: { status: "PAID" },
  });
}

/**
 * Returns every active stock hold without touching physical stock.
 *
 * Only `reserved` is decremented; `onHand` is unchanged because nothing was
 * sold. Already-paid or already-cancelled orders are left alone, so repeated
 * expiry deliveries cannot release the same hold twice.
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

  for (const reservation of order.reservations) {
    if (reservation.status !== "ACTIVE") {
      continue;
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

    await db.reservation.update({
      where: { id: reservation.id },
      data: { status: "RELEASED" },
    });
  }

  await db.payment.updateMany({
    where: { orderId },
    data: { status: "CANCELLED" },
  });

  await db.order.update({
    where: { id: orderId },
    data: { status: "CANCELLED" },
  });
}
