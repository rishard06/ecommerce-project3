import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Task 15 local signal: return approve/reject with mocked prisma + Stripe.
 *
 * The DB-backed suite (`return-decisions.test.ts`) is the behavioral spec
 * and runs in CI; this sandbox has no database egress, so this file pins
 * the same decision semantics against doubles: the PENDING → APPROVED claim
 * gates the single Stripe refund, repeats never reach Stripe, rejects never
 * touch money, and the admin actions surface guard/validation failures.
 */

const mocks = vi.hoisted(() => ({
  refundsCreate: vi.fn(),
  txReturnFindUnique: vi.fn(),
  txReturnFindUniqueOrThrow: vi.fn(),
  txReturnUpdateMany: vi.fn(),
  txOrderFindUnique: vi.fn(),
  txOrderUpdateMany: vi.fn(),
  txPaymentUpdateMany: vi.fn(),
  txReservationUpdateMany: vi.fn(),
  txAuditCreate: vi.fn(),
  txExecuteRaw: vi.fn(),
  topOrderFindUnique: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: { findUnique: mocks.topOrderFindUnique },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/features/payments/server/stripe-client", () => ({
  getStripe: () => ({
    refunds: { create: mocks.refundsCreate },
  }),
}));

vi.mock("@/features/identity/server/guards", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/identity/server/guards")>();
  return { ...actual, requireAdmin: vi.fn() };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  ReturnRequestNotFoundError,
  approveReturn,
  rejectReturn,
} from "./admin-order-service";
import { approveReturnAction, rejectReturnAction } from "./fulfillment-actions";
import { ForbiddenError, UnauthorizedError, requireAdmin } from "@/features/identity/server/guards";
import { revalidatePath } from "next/cache";

const requireAdminMock = vi.mocked(requireAdmin);
const revalidatePathMock = vi.mocked(revalidatePath);

const ADMIN = { id: "admin-1", email: "admin@example.com", role: "ADMIN" as const };
const ORDER_ID = "order-1";
const INTENT_ID = "pi_test_123";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.append(key, value);
  }
  return data;
}

/** A delivered, paid order row with a succeeded Stripe intent (pre-check). */
function paidDeliveredOrder(requestStatus: string | null) {
  return {
    status: "PAID",
    fulfillmentStatus: "DELIVERED",
    returnRequest: requestStatus ? { status: requestStatus } : null,
    payment: {
      status: "SUCCEEDED",
      provider: "stripe",
      providerPaymentIntentId: INTENT_ID,
    },
  };
}

/** The in-refund-transaction order snapshot: no reservations, no coupon. */
function txOrderSnapshot(requestStatus: string | null) {
  return {
    status: "PAID",
    fulfillmentStatus: "DELIVERED",
    couponCode: null,
    returnRequest: requestStatus ? { status: requestStatus } : null,
    reservations: [],
  };
}

function wireTransaction() {
  mocks.transaction.mockImplementation(
    async (callback: (tx: object) => unknown) =>
      callback({
        returnRequest: {
          findUnique: mocks.txReturnFindUnique,
          findUniqueOrThrow: mocks.txReturnFindUniqueOrThrow,
          updateMany: mocks.txReturnUpdateMany,
        },
        order: {
          findUnique: mocks.txOrderFindUnique,
          updateMany: mocks.txOrderUpdateMany,
        },
        payment: { updateMany: mocks.txPaymentUpdateMany },
        reservation: { updateMany: mocks.txReservationUpdateMany },
        orderAuditLog: { create: mocks.txAuditCreate },
        $executeRaw: mocks.txExecuteRaw,
      }),
  );
}

function wireRefundSuccess() {
  mocks.topOrderFindUnique.mockResolvedValue(paidDeliveredOrder("APPROVED"));
  mocks.txOrderFindUnique.mockResolvedValue(txOrderSnapshot("APPROVED"));
  mocks.txPaymentUpdateMany.mockResolvedValue({ count: 1 });
  mocks.txOrderUpdateMany.mockResolvedValue({ count: 1 });
  mocks.txAuditCreate.mockResolvedValue({});
  mocks.refundsCreate.mockResolvedValue({ id: "re_mock_123" });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminMock.mockResolvedValue(ADMIN);
  wireTransaction();
});

describe("approveReturn (mocked prisma + Stripe)", () => {
  it("claims PENDING -> APPROVED, then issues one Stripe refund and cancels", async () => {
    mocks.txReturnFindUnique.mockResolvedValue({ orderId: ORDER_ID, status: "PENDING" });
    mocks.txReturnUpdateMany.mockResolvedValue({ count: 1 });
    wireRefundSuccess();

    const result = await approveReturn(ORDER_ID, ADMIN.id);

    expect(result).toEqual({ approved: true, status: "APPROVED" });
    // The status claim lands before any money moves.
    expect(mocks.txReturnUpdateMany).toHaveBeenCalledWith({
      where: { orderId: ORDER_ID, status: "PENDING" },
      data: { status: "APPROVED" },
    });
    expect(mocks.refundsCreate).toHaveBeenCalledTimes(1);
    expect(mocks.refundsCreate).toHaveBeenCalledWith(
      { payment_intent: INTENT_ID },
      { idempotencyKey: `refund-${ORDER_ID}` },
    );
    expect(mocks.txOrderUpdateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: ORDER_ID, status: "PAID" }),
      data: { status: "CANCELLED", fulfillmentStatus: "CANCELLED" },
    });
    const actions = mocks.txAuditCreate.mock.calls.map(
      (call) => (call[0] as { data: { action: string } }).data.action,
    );
    expect(actions).toEqual(["RETURN_APPROVED", "ORDER_REFUNDED"]);
  });

  it("double-approve returns already-approved without a second Stripe call", async () => {
    mocks.txReturnFindUnique.mockResolvedValue({ orderId: ORDER_ID, status: "PENDING" });
    mocks.txReturnUpdateMany.mockResolvedValue({ count: 1 });
    wireRefundSuccess();

    const first = await approveReturn(ORDER_ID, ADMIN.id);

    mocks.txReturnFindUnique.mockResolvedValue({ orderId: ORDER_ID, status: "APPROVED" });
    mocks.txReturnUpdateMany.mockClear();
    const second = await approveReturn(ORDER_ID, ADMIN.id);

    expect(first).toEqual({ approved: true, status: "APPROVED" });
    expect(second).toEqual({ approved: false, status: "APPROVED" });
    expect(mocks.refundsCreate).toHaveBeenCalledTimes(1);
    expect(mocks.txReturnUpdateMany).not.toHaveBeenCalled();
  });

  it("two concurrent approvers issue a single Stripe refund", async () => {
    mocks.txReturnFindUnique.mockResolvedValue({ orderId: ORDER_ID, status: "PENDING" });
    // Exactly one conditional claim wins, mirroring the unique SQL predicate.
    mocks.txReturnUpdateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    mocks.txReturnFindUniqueOrThrow.mockResolvedValue({
      orderId: ORDER_ID,
      status: "APPROVED",
    });
    wireRefundSuccess();

    const results = await Promise.allSettled([
      approveReturn(ORDER_ID, ADMIN.id),
      approveReturn(ORDER_ID, ADMIN.id),
    ]);

    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    const values = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value);
    expect(values).toContainEqual({ approved: true, status: "APPROVED" });
    expect(values).toContainEqual({ approved: false, status: "APPROVED" });
    expect(mocks.refundsCreate).toHaveBeenCalledTimes(1);
  });

  it("throws without touching Stripe when no request exists", async () => {
    mocks.txReturnFindUnique.mockResolvedValue(null);

    await expect(approveReturn(ORDER_ID, ADMIN.id)).rejects.toThrow(
      ReturnRequestNotFoundError,
    );

    expect(mocks.refundsCreate).not.toHaveBeenCalled();
    expect(mocks.txAuditCreate).not.toHaveBeenCalled();
  });

  it("approve after reject is a no-op without Stripe", async () => {
    mocks.txReturnFindUnique.mockResolvedValue({ orderId: ORDER_ID, status: "REJECTED" });

    const result = await approveReturn(ORDER_ID, ADMIN.id);

    expect(result).toEqual({ approved: false, status: "REJECTED" });
    expect(mocks.refundsCreate).not.toHaveBeenCalled();
    expect(mocks.topOrderFindUnique).not.toHaveBeenCalled();
  });
});

describe("rejectReturn (mocked prisma)", () => {
  it("rejects PENDING with no Stripe call and no order change", async () => {
    mocks.txReturnFindUnique.mockResolvedValue({ orderId: ORDER_ID, status: "PENDING" });
    mocks.txReturnUpdateMany.mockResolvedValue({ count: 1 });
    mocks.txAuditCreate.mockResolvedValue({});

    const result = await rejectReturn(ORDER_ID, ADMIN.id);

    expect(result).toEqual({ rejected: true, status: "REJECTED" });
    expect(mocks.txReturnUpdateMany).toHaveBeenCalledWith({
      where: { orderId: ORDER_ID, status: "PENDING" },
      data: { status: "REJECTED" },
    });
    expect(mocks.refundsCreate).not.toHaveBeenCalled();
    expect(mocks.txOrderUpdateMany).not.toHaveBeenCalled();
    expect(mocks.txAuditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: ORDER_ID,
        actorId: ADMIN.id,
        action: "RETURN_REJECTED",
      }),
    });
  });

  it("reject after approve is a no-op", async () => {
    mocks.txReturnFindUnique.mockResolvedValue({ orderId: ORDER_ID, status: "APPROVED" });

    const result = await rejectReturn(ORDER_ID, ADMIN.id);

    expect(result).toEqual({ rejected: false, status: "APPROVED" });
    expect(mocks.txReturnUpdateMany).not.toHaveBeenCalled();
    expect(mocks.refundsCreate).not.toHaveBeenCalled();
  });

  it("throws without writing when no request exists", async () => {
    mocks.txReturnFindUnique.mockResolvedValue(null);

    await expect(rejectReturn(ORDER_ID, ADMIN.id)).rejects.toThrow(
      ReturnRequestNotFoundError,
    );

    expect(mocks.txAuditCreate).not.toHaveBeenCalled();
  });
});

describe("return decision actions (mocked boundary)", () => {
  it("rejects non-admin callers before touching the database", async () => {
    requireAdminMock.mockRejectedValueOnce(new UnauthorizedError());
    await expect(
      approveReturnAction(form({ orderId: ORDER_ID })),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    requireAdminMock.mockRejectedValueOnce(new ForbiddenError());
    await expect(
      rejectReturnAction(form({ orderId: ORDER_ID })),
    ).rejects.toBeInstanceOf(ForbiddenError);

    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("returns a validation error for a missing order id", async () => {
    const approved = await approveReturnAction(form({}));
    const rejected = await rejectReturnAction(form({}));

    expect(approved.success).toBe(false);
    expect(approved.error).toBeTruthy();
    expect(rejected.success).toBe(false);
    expect(rejected.error).toBeTruthy();
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("surfaces a missing request as an error", async () => {
    mocks.txReturnFindUnique.mockResolvedValue(null);

    const result = await approveReturnAction(form({ orderId: ORDER_ID }));

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no return request/i);
    expect(mocks.refundsCreate).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("approves through the action with revalidation", async () => {
    mocks.txReturnFindUnique.mockResolvedValue({ orderId: ORDER_ID, status: "PENDING" });
    mocks.txReturnUpdateMany.mockResolvedValue({ count: 1 });
    wireRefundSuccess();

    const result = await approveReturnAction(form({ orderId: ORDER_ID }));

    expect(result).toEqual({ success: true });
    expect(mocks.refundsCreate).toHaveBeenCalledTimes(1);
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/orders");
    expect(revalidatePathMock).toHaveBeenCalledWith(`/admin/orders/${ORDER_ID}`);
  });

  it("rejects through the action with no Stripe call", async () => {
    mocks.txReturnFindUnique.mockResolvedValue({ orderId: ORDER_ID, status: "PENDING" });
    mocks.txReturnUpdateMany.mockResolvedValue({ count: 1 });
    mocks.txAuditCreate.mockResolvedValue({});

    const result = await rejectReturnAction(form({ orderId: ORDER_ID }));

    expect(result).toEqual({ success: true });
    expect(mocks.refundsCreate).not.toHaveBeenCalled();
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/orders");
    expect(revalidatePathMock).toHaveBeenCalledWith(`/admin/orders/${ORDER_ID}`);
  });
});
