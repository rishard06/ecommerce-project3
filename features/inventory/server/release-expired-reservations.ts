import { prisma } from "@/lib/prisma";

/** Upper bound on the expired reservations handled by one invocation. */
const BATCH_SIZE = 100;

/**
 * Raised when the guarded `reserved` decrement cannot be satisfied, which
 * indicates inconsistent inventory state. The surrounding transaction rolls
 * back the reservation claim, so nothing is released by the failed attempt.
 */
export class ReservationReleaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReservationReleaseError";
  }
}

interface ExpiredReservation {
  id: string;
  orderId: string;
  variantId: string;
  quantity: number;
  order: { status: "PENDING" | "PAID" | "CANCELLED" };
}

/**
 * Reclaims abandoned checkout holds whose 30-minute TTL has elapsed.
 *
 * Eligible rows are `ACTIVE` reservations with `expiresAt <= now`. Each order
 * is processed in its own transaction: reservations are claimed with a
 * conditional `ACTIVE -> RELEASED` update, `ProductVariant.reserved` is
 * decremented only when the claim succeeds and the `reserved >= quantity`
 * guard holds, and a still-pending order/payment is cancelled once no active
 * hold remains. `onHand` is never touched because nothing was sold.
 *
 * The conditional claim makes retries and concurrent cron invocations
 * idempotent: a reservation can transition only once, so `released` counts
 * only reservations actually released by this invocation. Paid orders are
 * skipped entirely because their reservations must have been committed by the
 * payment webhook; releasing them would corrupt stock.
 */
export async function releaseExpiredReservations(
  now: Date = new Date(),
): Promise<{ released: number }> {
  const candidates: ExpiredReservation[] = await prisma.reservation.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lte: now },
    },
    select: {
      id: true,
      orderId: true,
      variantId: true,
      quantity: true,
      order: { select: { status: true } },
    },
    orderBy: [{ expiresAt: "asc" }, { id: "asc" }],
    take: BATCH_SIZE,
  });

  const reservationsByOrder = new Map<string, ExpiredReservation[]>();

  for (const reservation of candidates) {
    if (reservation.order.status === "PAID") {
      console.warn(
        `[release-expired-reservations] Skipping reservation ${reservation.id} for paid order ${reservation.orderId}`,
      );
      continue;
    }

    const orderReservations =
      reservationsByOrder.get(reservation.orderId) ?? [];
    orderReservations.push(reservation);
    reservationsByOrder.set(reservation.orderId, orderReservations);
  }

  let released = 0;

  for (const orderId of [...reservationsByOrder.keys()].sort()) {
    // Deterministic lock order reduces deadlock risk between concurrent runs.
    const orderReservations = (
      reservationsByOrder.get(orderId) ?? []
    ).sort(
      (left, right) =>
        left.variantId.localeCompare(right.variantId) ||
        left.id.localeCompare(right.id),
    );

    const releasedForOrder = await prisma.$transaction(async (tx) => {
      // Re-check inside the transaction in case a payment webhook paid the
      // order after the initial candidate query.
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { status: true },
      });

      if (order?.status === "PAID") {
        console.warn(
          `[release-expired-reservations] Skipping reservations for paid order ${orderId}`,
        );
        return 0;
      }

      let claimedCount = 0;

      for (const reservation of orderReservations) {
        // The conditional claim is the idempotency boundary: concurrent runs
        // race on this row, and only the winner may decrement inventory.
        const claim = await tx.reservation.updateMany({
          where: { id: reservation.id, status: "ACTIVE" },
          data: { status: "RELEASED" },
        });

        if (claim.count !== 1) {
          continue;
        }

        const affected = await tx.$executeRaw`
          UPDATE "product_variant"
          SET "reserved" = "reserved" - ${reservation.quantity}
          WHERE "id" = ${reservation.variantId}
            AND "reserved" >= ${reservation.quantity}
        `;

        if (affected !== 1) {
          throw new ReservationReleaseError("Unable to release reserved stock");
        }

        claimedCount += 1;
      }

      // Cancel the order only after no active hold remains. An order with an
      // unexpired reservation still has a live checkout and must stay pending.
      const remainingActive = await tx.reservation.count({
        where: { orderId, status: "ACTIVE" },
      });

      if (remainingActive === 0) {
        await tx.payment.updateMany({
          where: { orderId, status: "PENDING" },
          data: { status: "CANCELLED" },
        });

        await tx.order.updateMany({
          where: { id: orderId, status: "PENDING" },
          data: { status: "CANCELLED" },
        });
      }

      return claimedCount;
    });

    released += releasedForOrder;
  }

  return { released };
}
