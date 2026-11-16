import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Task 18 local signal: SHIPPED / DELIVERED emails with mocked prisma.
 *
 * The DB-backed suite (`fulfillment-emails.test.ts`) is the behavioral spec
 * and runs in CI; this sandbox has no database egress, so this file pins the
 * same semantics against doubles: SHIPPED sends once, DELIVERED sends once,
 * other transitions send nothing, a duplicate transition is rejected by the
 * state machine before any resend, guest orders (no stored email) are
 * skipped, email failure never fails the action, and the order write touches
 * only `fulfillmentStatus` (payment state is never changed).
 */

const mocks = vi.hoisted(() => ({
  txOrderFindUnique: vi.fn(),
  txOrderUpdateMany: vi.fn(),
  txAuditCreate: vi.fn(),
  topOrderFindUnique: vi.fn(),
  transaction: vi.fn(),
  sendEmail: vi.fn(),
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
  getStripe: () => {
    throw new Error("Stripe must not be touched by fulfillment emails");
  },
}));

vi.mock("@/features/identity/server/guards", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/identity/server/guards")>();
  return { ...actual, requireAdmin: vi.fn() };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { updateFulfillmentAction } from "./fulfillment-actions";
import {
  ForbiddenError,
  UnauthorizedError,
  requireAdmin,
} from "@/features/identity/server/guards";
import { revalidatePath } from "next/cache";

const requireAdminMock = vi.mocked(requireAdmin);
const revalidatePathMock = vi.mocked(revalidatePath);

const ADMIN = { id: "admin-1", email: "admin@example.com", role: "ADMIN" as const };
const ORDER_ID = "order-1";
const CUSTOMER_EMAIL = "customer@example.com";

/** In-memory order row driven by the conditional tx mocks below. */
let db: { status: string; fulfillmentStatus: string; userEmail: string | null };

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.append(key, value);
  }
  return data;
}

function wireMocks() {
  mocks.transaction.mockImplementation(
    async (callback: (tx: object) => unknown) =>
      callback({
        order: {
          findUnique: mocks.txOrderFindUnique,
          updateMany: mocks.txOrderUpdateMany,
        },
        orderAuditLog: { create: mocks.txAuditCreate },
      }),
  );

  // The service reads the row inside the transaction.
  mocks.txOrderFindUnique.mockImplementation(async () => ({
    status: db.status,
    fulfillmentStatus: db.fulfillmentStatus,
  }));

  // The conditional claim is the exactly-once boundary: only the first
  // writer moving off the observed status wins.
  mocks.txOrderUpdateMany.mockImplementation(
    async (args: {
      where: { id: string; fulfillmentStatus: string };
      data: { fulfillmentStatus: string };
    }) => {
      if (args.where.fulfillmentStatus !== db.fulfillmentStatus) {
        return { count: 0 };
      }
      db.fulfillmentStatus = args.data.fulfillmentStatus;
      return { count: 1 };
    },
  );

  mocks.txAuditCreate.mockResolvedValue({});

  // The email module re-reads the order for the recipient after commit.
  mocks.topOrderFindUnique.mockImplementation(async () => ({
    id: ORDER_ID,
    user: db.userEmail ? { email: db.userEmail } : null,
  }));
}

function resetDb(fulfillmentStatus: string, userEmail: string | null = CUSTOMER_EMAIL) {
  db = { status: "PAID", fulfillmentStatus, userEmail };
}

beforeEach(() => {
  vi.resetAllMocks();
  requireAdminMock.mockResolvedValue(ADMIN);
  mocks.sendEmail.mockResolvedValue({ id: "test-email-id" });
  resetDb("UNFULFILLED");
  wireMocks();
});

describe("fulfillment status emails (mocked prisma)", () => {
  it("sends exactly one email on PROCESSING → SHIPPED", async () => {
    resetDb("PROCESSING");

    const result = await updateFulfillmentAction(
      form({ orderId: ORDER_ID, next: "SHIPPED" }),
    );

    expect(result).toEqual({ success: true });
    expect(db.fulfillmentStatus).toBe("SHIPPED");
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: CUSTOMER_EMAIL }),
    );
    const payload = mocks.sendEmail.mock.calls[0][0] as {
      subject: string;
      html: string;
    };
    expect(payload.subject).toMatch(/shipped/i);
    expect(payload.html).toContain("SHIPPED");
  });

  it("sends exactly one email on SHIPPED → DELIVERED", async () => {
    resetDb("SHIPPED");

    const result = await updateFulfillmentAction(
      form({ orderId: ORDER_ID, next: "DELIVERED" }),
    );

    expect(result).toEqual({ success: true });
    expect(db.fulfillmentStatus).toBe("DELIVERED");
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: CUSTOMER_EMAIL }),
    );
    const payload = mocks.sendEmail.mock.calls[0][0] as {
      subject: string;
      html: string;
    };
    expect(payload.subject).toMatch(/delivered/i);
    expect(payload.html).toContain("DELIVERED");
  });

  it("sends nothing on UNFULFILLED → PROCESSING", async () => {
    resetDb("UNFULFILLED");

    const result = await updateFulfillmentAction(
      form({ orderId: ORDER_ID, next: "PROCESSING" }),
    );

    expect(result).toEqual({ success: true });
    expect(db.fulfillmentStatus).toBe("PROCESSING");
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("sends nothing on cancellation", async () => {
    resetDb("PROCESSING");

    const result = await updateFulfillmentAction(
      form({ orderId: ORDER_ID, next: "CANCELLED" }),
    );

    expect(result).toEqual({ success: true });
    expect(db.fulfillmentStatus).toBe("CANCELLED");
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("never resends on a duplicate transition (exactly-once)", async () => {
    resetDb("PROCESSING");

    const first = await updateFulfillmentAction(
      form({ orderId: ORDER_ID, next: "SHIPPED" }),
    );
    expect(first).toEqual({ success: true });
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);

    // The retry observes SHIPPED ≠ PROCESSING, loses the conditional claim,
    // and is rejected before any resend.
    const retry = await updateFulfillmentAction(
      form({ orderId: ORDER_ID, next: "SHIPPED" }),
    );
    expect(retry.success).toBe(false);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("succeeds without email for guest orders (no stored email address)", async () => {
    resetDb("PROCESSING", null);

    const result = await updateFulfillmentAction(
      form({ orderId: ORDER_ID, next: "SHIPPED" }),
    );

    expect(result).toEqual({ success: true });
    expect(db.fulfillmentStatus).toBe("SHIPPED");
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("still succeeds when the email provider fails (best-effort)", async () => {
    resetDb("PROCESSING");
    mocks.sendEmail.mockRejectedValueOnce(new Error("provider down"));

    const result = await updateFulfillmentAction(
      form({ orderId: ORDER_ID, next: "SHIPPED" }),
    );

    expect(result).toEqual({ success: true });
    expect(db.fulfillmentStatus).toBe("SHIPPED");
  });

  it("the fulfillment write touches only fulfillmentStatus, never payment state", async () => {
    resetDb("PROCESSING");

    await updateFulfillmentAction(form({ orderId: ORDER_ID, next: "SHIPPED" }));

    expect(mocks.txOrderUpdateMany).toHaveBeenCalledTimes(1);
    expect(mocks.txOrderUpdateMany).toHaveBeenCalledWith({
      where: { id: ORDER_ID, fulfillmentStatus: "PROCESSING" },
      data: { fulfillmentStatus: "SHIPPED" },
    });
  });

  it("rejects non-admin callers before any transition or email", async () => {
    requireAdminMock.mockRejectedValueOnce(new UnauthorizedError());
    await expect(
      updateFulfillmentAction(form({ orderId: ORDER_ID, next: "SHIPPED" })),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    requireAdminMock.mockRejectedValueOnce(new ForbiddenError());
    await expect(
      updateFulfillmentAction(form({ orderId: ORDER_ID, next: "DELIVERED" })),
    ).rejects.toBeInstanceOf(ForbiddenError);

    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
