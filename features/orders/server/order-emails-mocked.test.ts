import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Ticket #14 RED: trigger + best-effort tests for order emails with mocked
 * prisma/Stripe/email client (same pattern as
 * `return-decisions-mocked.test.ts`; this sandbox's DB suites are the
 * behavioral spec in CI).
 *
 * Contract under test:
 * - payment success (signed-in) sends exactly one confirmation;
 * - guest + explicit opt-in sends the guest confirmation to the stored address;
 * - guest without opt-in sends nothing;
 * - a send failure never fails the money path (every send resolves; every
 *   admin action still returns success and still commits its transition);
 * - generic admin refund sends refundIssued once;
 * - approve sends returnApproved only when the decision approved;
 * - reject sends returnRejected only when the decision rejected.
 */

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
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

vi.mock("@/lib/email/client", () => ({
  sendEmail: mocks.sendEmail,
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

import { sendOrderConfirmation } from "@/lib/email/send-order-confirmation";
import { sendRefundIssuedEmail } from "@/lib/email/send-refund-email";
import {
  sendReturnApprovedEmail,
  sendReturnRejectedEmail,
} from "@/lib/email/send-return-decision-email";
import {
  approveReturnAction,
  refundOrderAction,
  rejectReturnAction,
} from "@/features/orders/server/fulfillment-actions";
import { requireAdmin } from "@/features/identity/server/guards";

const requireAdminMock = vi.mocked(requireAdmin);

const ADMIN = { id: "admin-1", email: "admin@example.com", role: "ADMIN" as const };
const ORDER_ID = "order-1";
const CUSTOMER_EMAIL = "customer@example.com";
const GUEST_EMAIL = "guest@example.com";
const INTENT_ID = "pi_test_123";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.append(key, value);
  }
  return data;
}

function orderRow(options: {
  userEmail?: string | null;
  guestEmail?: string | null;
  guestEmailOptIn?: boolean;
}) {
  const { userEmail = CUSTOMER_EMAIL, guestEmail = null, guestEmailOptIn = false } =
    options;
  return {
    id: ORDER_ID,
    totalCents: 4818,
    guestEmail,
    guestEmailOptIn,
    user: userEmail ? { email: userEmail } : null,
    items: [
      {
        title: "Snapshot product",
        quantity: 2,
        lineTotalCents: 3998,
      },
    ],
    shippingFullName: "Jane Doe",
    shippingCity: "Springfield",
    shippingCountry: "US",
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

/** Refundable pre-check row for a PAID/UNFULFILLED order. */
function genericRefundPrecheckRow() {
  return {
    status: "PAID",
    fulfillmentStatus: "UNFULFILLED",
    returnRequest: null,
    payment: {
      status: "SUCCEEDED",
      provider: "stripe",
      providerPaymentIntentId: INTENT_ID,
    },
    ...orderRow({}),
  };
}

/** Refundable pre-check row for a PAID/DELIVERED/APPROVED order. */
function approvedReturnPrecheckRow() {
  return {
    status: "PAID",
    fulfillmentStatus: "DELIVERED",
    returnRequest: { status: "APPROVED" },
    payment: {
      status: "SUCCEEDED",
      provider: "stripe",
      providerPaymentIntentId: INTENT_ID,
    },
    ...orderRow({}),
  };
}

/** Refundable pre-check row + in-refund snapshot for a PAID/UNFULFILLED order. */
function wireGenericRefund() {
  mocks.topOrderFindUnique.mockResolvedValue(genericRefundPrecheckRow());
  mocks.txOrderFindUnique.mockResolvedValue({
    status: "PAID",
    fulfillmentStatus: "UNFULFILLED",
    couponCode: null,
    returnRequest: null,
    reservations: [],
  });
  mocks.txPaymentUpdateMany.mockResolvedValue({ count: 1 });
  mocks.txOrderUpdateMany.mockResolvedValue({ count: 1 });
  mocks.txAuditCreate.mockResolvedValue({});
  mocks.refundsCreate.mockResolvedValue({ id: "re_mock_123" });
}

/** Refundable pre-check row + snapshot for a PAID/DELIVERED/APPROVED order. */
function wireApprovedReturnRefund() {
  mocks.topOrderFindUnique.mockResolvedValue(approvedReturnPrecheckRow());
  mocks.txOrderFindUnique.mockResolvedValue({
    status: "PAID",
    fulfillmentStatus: "DELIVERED",
    couponCode: null,
    returnRequest: { status: "APPROVED" },
    reservations: [],
  });
  mocks.txPaymentUpdateMany.mockResolvedValue({ count: 1 });
  mocks.txOrderUpdateMany.mockResolvedValue({ count: 1 });
  mocks.txAuditCreate.mockResolvedValue({});
  mocks.refundsCreate.mockResolvedValue({ id: "re_mock_123" });
}

beforeEach(() => {
  vi.resetAllMocks();
  requireAdminMock.mockResolvedValue(ADMIN);
  mocks.sendEmail.mockResolvedValue({ id: "test-email-id" });
  wireTransaction();
});

describe("order confirmation sends (mocked prisma)", () => {
  it("sends the signed-in confirmation to the account email", async () => {
    mocks.topOrderFindUnique.mockResolvedValue(orderRow({}));

    await sendOrderConfirmation(ORDER_ID);

    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: CUSTOMER_EMAIL }),
    );
    const payload = mocks.sendEmail.mock.calls[0][0] as {
      subject: string;
      html: string;
    };
    expect(payload.subject).toMatch(/confirm/i);
    expect(payload.html).toContain("Snapshot product");
  });

  it("sends the guest confirmation to the stored opt-in address", async () => {
    mocks.topOrderFindUnique.mockResolvedValue(
      orderRow({ userEmail: null, guestEmail: GUEST_EMAIL, guestEmailOptIn: true }),
    );

    await sendOrderConfirmation(ORDER_ID);

    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: GUEST_EMAIL }),
    );
  });

  it("sends nothing for a guest without opt-in", async () => {
    mocks.topOrderFindUnique.mockResolvedValue(
      orderRow({ userEmail: null, guestEmail: null, guestEmailOptIn: false }),
    );

    await sendOrderConfirmation(ORDER_ID);

    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("sends nothing for a guest address stored without the opt-in flag", async () => {
    mocks.topOrderFindUnique.mockResolvedValue(
      orderRow({ userEmail: null, guestEmail: GUEST_EMAIL, guestEmailOptIn: false }),
    );

    await sendOrderConfirmation(ORDER_ID);

    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("never throws when the provider fails (money path stays safe)", async () => {
    mocks.topOrderFindUnique.mockResolvedValue(orderRow({}));
    mocks.sendEmail.mockRejectedValueOnce(new Error("provider down"));

    await expect(sendOrderConfirmation(ORDER_ID)).resolves.toBeUndefined();
  });
});

describe("refund + return decision sends (mocked actions)", () => {
  it("generic refund sends refundIssued once", async () => {
    mocks.txReturnFindUnique.mockResolvedValue(null);
    wireGenericRefund();

    const result = await refundOrderAction(form({ orderId: ORDER_ID }));

    expect(result).toEqual({ success: true });
    expect(mocks.refundsCreate).toHaveBeenCalledTimes(1);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    const payload = mocks.sendEmail.mock.calls[0][0] as {
      to: string;
      subject: string;
      html: string;
    };
    expect(payload.to).toBe(CUSTOMER_EMAIL);
    expect(payload.subject).toMatch(/refund/i);
    expect(payload.html).toContain("$48.18");
  });

  it("generic refund still succeeds when the email provider fails", async () => {
    mocks.txReturnFindUnique.mockResolvedValue(null);
    wireGenericRefund();
    mocks.sendEmail.mockRejectedValueOnce(new Error("provider down"));

    const result = await refundOrderAction(form({ orderId: ORDER_ID }));

    expect(result).toEqual({ success: true });
    expect(mocks.refundsCreate).toHaveBeenCalledTimes(1);
    const updated = mocks.txOrderUpdateMany.mock.calls[0][0] as {
      data: { status: string };
    };
    expect(updated.data.status).toBe("CANCELLED");
  });

  it("approve sends returnApproved only when the decision approved", async () => {
    mocks.txReturnFindUnique.mockResolvedValue({ orderId: ORDER_ID, status: "PENDING" });
    mocks.txReturnUpdateMany.mockResolvedValue({ count: 1 });
    wireApprovedReturnRefund();

    const result = await approveReturnAction(form({ orderId: ORDER_ID }));

    expect(result).toEqual({ success: true });
    expect(mocks.refundsCreate).toHaveBeenCalledTimes(1);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    const payload = mocks.sendEmail.mock.calls[0][0] as { subject: string };
    expect(payload.subject).toMatch(/approv/i);
  });

  it("approve still succeeds when the email provider fails", async () => {
    mocks.txReturnFindUnique.mockResolvedValue({ orderId: ORDER_ID, status: "PENDING" });
    mocks.txReturnUpdateMany.mockResolvedValue({ count: 1 });
    wireApprovedReturnRefund();
    mocks.sendEmail.mockRejectedValueOnce(new Error("provider down"));

    const result = await approveReturnAction(form({ orderId: ORDER_ID }));

    expect(result).toEqual({ success: true });
    expect(mocks.refundsCreate).toHaveBeenCalledTimes(1);
  });

  it("repeat approve sends nothing", async () => {
    mocks.txReturnFindUnique.mockResolvedValue({ orderId: ORDER_ID, status: "PENDING" });
    mocks.txReturnUpdateMany.mockResolvedValue({ count: 1 });
    wireApprovedReturnRefund();

    const first = await approveReturnAction(form({ orderId: ORDER_ID }));
    expect(first).toEqual({ success: true });
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);

    // The completed refund left the order CANCELLED: a true no-op.
    mocks.txReturnFindUnique.mockResolvedValue({ orderId: ORDER_ID, status: "APPROVED" });
    mocks.txOrderFindUnique.mockResolvedValue({ status: "CANCELLED" });

    const second = await approveReturnAction(form({ orderId: ORDER_ID }));
    expect(second).toEqual({ success: true });
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(mocks.refundsCreate).toHaveBeenCalledTimes(1);
  });

  it("reject sends returnRejected once", async () => {
    mocks.txReturnFindUnique.mockResolvedValue({ orderId: ORDER_ID, status: "PENDING" });
    mocks.txReturnUpdateMany.mockResolvedValue({ count: 1 });
    mocks.txAuditCreate.mockResolvedValue({});
    mocks.topOrderFindUnique.mockResolvedValue(orderRow({}));

    const result = await rejectReturnAction(form({ orderId: ORDER_ID }));

    expect(result).toEqual({ success: true });
    expect(mocks.refundsCreate).not.toHaveBeenCalled();
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    const payload = mocks.sendEmail.mock.calls[0][0] as { subject: string; html: string };
    expect(payload.subject).toMatch(/return/i);
    expect(payload.html).toMatch(/no refund/i);
  });

  it("reject still succeeds when the email provider fails", async () => {
    mocks.txReturnFindUnique.mockResolvedValue({ orderId: ORDER_ID, status: "PENDING" });
    mocks.txReturnUpdateMany.mockResolvedValue({ count: 1 });
    mocks.txAuditCreate.mockResolvedValue({});
    mocks.topOrderFindUnique.mockResolvedValue(orderRow({}));
    mocks.sendEmail.mockRejectedValueOnce(new Error("provider down"));

    const result = await rejectReturnAction(form({ orderId: ORDER_ID }));

    expect(result).toEqual({ success: true });
    expect(mocks.txReturnUpdateMany).toHaveBeenCalledWith({
      where: { orderId: ORDER_ID, status: "PENDING" },
      data: { status: "REJECTED" },
    });
  });

  it("reject after approve sends nothing", async () => {
    mocks.txReturnFindUnique.mockResolvedValue({ orderId: ORDER_ID, status: "APPROVED" });

    const result = await rejectReturnAction(form({ orderId: ORDER_ID }));

    expect(result).toEqual({ success: true });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});

describe("send modules never throw on their own DB read (F1)", () => {
  it("confirmation resolves when findUnique throws", async () => {
    mocks.topOrderFindUnique.mockRejectedValueOnce(new Error("db down"));

    await expect(sendOrderConfirmation(ORDER_ID)).resolves.toBeUndefined();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("refund notice resolves when findUnique throws", async () => {
    mocks.topOrderFindUnique.mockRejectedValueOnce(new Error("db down"));

    await expect(sendRefundIssuedEmail(ORDER_ID)).resolves.toBeUndefined();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("decision notices resolve when findUnique throws", async () => {
    mocks.topOrderFindUnique.mockRejectedValueOnce(new Error("db down"));

    await expect(sendReturnApprovedEmail(ORDER_ID)).resolves.toBeUndefined();

    mocks.topOrderFindUnique.mockRejectedValueOnce(new Error("db down"));

    await expect(sendReturnRejectedEmail(ORDER_ID)).resolves.toBeUndefined();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("generic refund still succeeds when the notice read fails", async () => {
    mocks.txReturnFindUnique.mockResolvedValue(null);
    wireGenericRefund();
    // Pre-check (call 1) succeeds; the send-module read (call 2) throws.
    mocks.topOrderFindUnique.mockReset();
    mocks.topOrderFindUnique
      .mockResolvedValueOnce(genericRefundPrecheckRow())
      .mockRejectedValue(new Error("db down"));

    const result = await refundOrderAction(form({ orderId: ORDER_ID }));

    expect(result).toEqual({ success: true });
    expect(mocks.refundsCreate).toHaveBeenCalledTimes(1);
  });

  it("approve still succeeds when the notice read fails", async () => {
    mocks.txReturnFindUnique.mockResolvedValue({ orderId: ORDER_ID, status: "PENDING" });
    mocks.txReturnUpdateMany.mockResolvedValue({ count: 1 });
    wireApprovedReturnRefund();
    // Pre-check (call 1) succeeds; the send-module read (call 2) throws.
    mocks.topOrderFindUnique.mockReset();
    mocks.topOrderFindUnique
      .mockResolvedValueOnce(approvedReturnPrecheckRow())
      .mockRejectedValue(new Error("db down"));

    const result = await approveReturnAction(form({ orderId: ORDER_ID }));

    expect(result).toEqual({ success: true });
    expect(mocks.refundsCreate).toHaveBeenCalledTimes(1);
  });

  it("reject still succeeds when the notice read fails", async () => {
    mocks.txReturnFindUnique.mockResolvedValue({ orderId: ORDER_ID, status: "PENDING" });
    mocks.txReturnUpdateMany.mockResolvedValue({ count: 1 });
    mocks.txAuditCreate.mockResolvedValue({});
    mocks.topOrderFindUnique.mockReset();
    mocks.topOrderFindUnique.mockRejectedValue(new Error("db down"));

    const result = await rejectReturnAction(form({ orderId: ORDER_ID }));

    expect(result).toEqual({ success: true });
    expect(mocks.txReturnUpdateMany).toHaveBeenCalledWith({
      where: { orderId: ORDER_ID, status: "PENDING" },
      data: { status: "REJECTED" },
    });
  });
});
