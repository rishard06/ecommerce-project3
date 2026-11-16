import { prisma } from "@/lib/prisma";
import type { ReturnStatus } from "@/app/generated/prisma";

/**
 * Customer return-request creation (Task 14).
 *
 * This module holds domain logic only and intentionally has no
 * `"use server"` directive: pages call `requestReturn` from an inline server
 * action (the same pattern as `cancelOrder` in
 * `features/orders/server/customer-order-service.ts`), which keeps the typed
 * errors below importable. A `FormData` action wrapper arrives with the
 * customer UI task; there is no page consuming one in this batch.
 *
 * Rules:
 * - Ownership is part of the SQL predicate for every lookup, using the same
 *   viewer shape as `getOrderForViewer`: authenticated users match by
 *   `userId`, guests by their unguessable `guestToken`. Anything else
 *   resolves to `OrderNotFoundError`, so callers cannot distinguish a missing
 *   id from another customer's order.
 * - Only `PAID` + `DELIVERED` orders may be returned. The `PAID` gate keeps
 *   the Task 15 approve path honest: approving triggers `refundPayment`,
 *   which only refunds succeeded Stripe payments, so a request must never
 *   exist on an order with no captured money.
 * - Only deliveries within the last 30 days may be returned. Orders carry no
 *   `deliveredAt` column, so the window is anchored on `Order.updatedAt`,
 *   which the fulfillment transition to `DELIVERED` bumps. Good enough for
 *   the MVP policy; a dedicated timestamp is a future refinement.
 * - One request per order. `ReturnRequest.orderId` is `@unique`, so a second
 *   request is rejected at the database level; the pre-check plus the
 *   `P2002` mapping below make concurrent double-submits deterministic.
 * - Money is never touched here: this only records the request. Refunds
 *   belong to the Task 15 approve path.
 */

/** Viewer identity for ownership scoping (mirrors `OrderViewer`). */
export interface ReturnViewer {
  userId?: string | null;
  guestToken?: string | null;
}

/** Raised when creation targets a missing order or one owned by another viewer. */
export class OrderNotFoundError extends Error {
  constructor() {
    super("Order not found.");
    this.name = "OrderNotFoundError";
  }
}

/**
 * Raised when the order's state or the input cannot produce a request: not
 * delivered/paid, outside the 30-day window, or a missing/too-long reason.
 */
export class ReturnNotEligibleError extends Error {
  constructor(message = "This order is not eligible for a return.") {
    super(message);
    this.name = "ReturnNotEligibleError";
  }
}

/** Raised when a request already exists for the order (unique per order). */
export class DuplicateReturnError extends Error {
  constructor() {
    super("A return request already exists for this order.");
    this.name = "DuplicateReturnError";
  }
}

/** Audit marker for a customer-initiated return request. Plain string, no migration. */
export const RETURN_REQUESTED_ACTION = "RETURN_REQUESTED";

/** Return window in days, anchored on `Order.updatedAt` (see module doc). */
export const RETURN_WINDOW_DAYS = 30;

const RETURN_WINDOW_MS = RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/** Free-text reason cap; the column itself is unbounded text. */
const MAX_REASON_LENGTH = 1000;

/** Serializable snapshot of the created request. */
export interface ReturnRequestResult {
  id: string;
  orderId: string;
  status: ReturnStatus;
  reason: string;
  createdAt: Date;
}

/** Prisma unique-constraint violation (duplicate `orderId`). */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002"
  );
}

/**
 * Records a customer return request for a delivered order.
 *
 * Creates the `PENDING` `ReturnRequest` row and a `RETURN_REQUESTED` audit
 * entry in one transaction. Ownership failures throw `OrderNotFoundError`;
 * ineligible state or input throws `ReturnNotEligibleError`; an existing
 * request for the order throws `DuplicateReturnError` with no writes.
 */
export async function requestReturn(
  orderId: string,
  viewer: ReturnViewer,
  reason: string,
): Promise<ReturnRequestResult> {
  const trimmedReason = reason.trim();
  if (trimmedReason.length === 0) {
    throw new ReturnNotEligibleError("A reason for the return is required.");
  }
  if (trimmedReason.length > MAX_REASON_LENGTH) {
    throw new ReturnNotEligibleError(
      `Return reason must be ${MAX_REASON_LENGTH} characters or fewer.`,
    );
  }

  if (!orderId) {
    throw new OrderNotFoundError();
  }

  let ownedId: string | null = null;
  if (viewer.userId) {
    const owned = await prisma.order.findFirst({
      where: { id: orderId, userId: viewer.userId },
      select: { id: true },
    });
    if (owned) {
      ownedId = owned.id;
    }
  }
  if (!ownedId && viewer.guestToken) {
    const guest = await prisma.order.findFirst({
      where: { id: orderId, guestToken: viewer.guestToken },
      select: { id: true },
    });
    if (guest) {
      ownedId = guest.id;
    }
  }

  if (!ownedId) {
    throw new OrderNotFoundError();
  }

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: ownedId },
      select: { status: true, fulfillmentStatus: true, updatedAt: true },
    });

    if (!order) {
      throw new OrderNotFoundError();
    }

    if (order.status !== "PAID" || order.fulfillmentStatus !== "DELIVERED") {
      throw new ReturnNotEligibleError(
        "Only delivered paid orders can be returned.",
      );
    }

    if (Date.now() - order.updatedAt.getTime() > RETURN_WINDOW_MS) {
      throw new ReturnNotEligibleError(
        `Returns are only accepted within ${RETURN_WINDOW_DAYS} days of delivery.`,
      );
    }

    const existing = await tx.returnRequest.findUnique({
      where: { orderId: ownedId },
    });
    if (existing) {
      throw new DuplicateReturnError();
    }

    try {
      const created = await tx.returnRequest.create({
        data: { orderId: ownedId, reason: trimmedReason },
      });

      await tx.orderAuditLog.create({
        data: {
          orderId: ownedId,
          actorId: viewer.userId ?? null,
          action: RETURN_REQUESTED_ACTION,
          fromStatus: "DELIVERED",
          toStatus: "PENDING",
        },
      });

      return {
        id: created.id,
        orderId: created.orderId,
        status: created.status,
        reason: created.reason,
        createdAt: created.createdAt,
      };
    } catch (error) {
      // A concurrent request that won the race hits the unique index; report
      // it as a duplicate rather than a generic persistence failure.
      if (isUniqueViolation(error)) {
        throw new DuplicateReturnError();
      }
      throw error;
    }
  });
}
