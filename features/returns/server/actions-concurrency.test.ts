import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  topFindFirst: vi.fn(),
  txFindFirst: vi.fn(),
  txFindUnique: vi.fn(),
  txFindReturn: vi.fn(),
  txCreateReturn: vi.fn(),
  txCreateAudit: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: { findFirst: mocks.topFindFirst },
    $transaction: mocks.transaction,
  },
}));

import {
  DuplicateReturnError,
  requestReturn,
  RETURN_REQUESTED_ACTION,
  ReturnNotEligibleError,
} from "./actions";

const NOW = Date.now();

/** Eligible DELIVERED-in-window order row shape returned by the tx doubles. */
function eligibleOrder() {
  return {
    id: "order-1",
    status: "PAID",
    fulfillmentStatus: "DELIVERED",
    updatedAt: new Date(NOW - 5 * 24 * 60 * 60 * 1000),
  };
}

/**
 * Wires the ownership + eligibility reads for the happy path. Both the
 * pre-refactor (`tx.order.findUnique`) and post-refactor
 * (`tx.order.findFirst`) read shapes are provided so the suite pins behavior,
 * not structure.
 */
function wireHappyPath() {
  mocks.topFindFirst.mockResolvedValue({ id: "order-1" });
  mocks.txFindFirst.mockResolvedValue(eligibleOrder());
  mocks.txFindUnique.mockResolvedValue(eligibleOrder());
  mocks.txFindReturn.mockResolvedValue(null);
  mocks.txCreateReturn.mockImplementation(async (args: { data: object }) => ({
    id: "rr-1",
    status: "PENDING",
    createdAt: new Date(NOW),
    ...args.data,
  }));
  mocks.txCreateAudit.mockResolvedValue({});
  mocks.transaction.mockImplementation(async (callback: (tx: object) => unknown) =>
    callback({
      order: { findFirst: mocks.txFindFirst, findUnique: mocks.txFindUnique },
      returnRequest: {
        findUnique: mocks.txFindReturn,
        create: mocks.txCreateReturn,
      },
      orderAuditLog: { create: mocks.txCreateAudit },
    }),
  );
}

function prismaError(code: string): Error {
  return Object.assign(new Error(code), { code });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requestReturn audit + concurrency (mocked prisma)", () => {
  it("records the audit with null from/to statuses because the order itself is unchanged", async () => {
    wireHappyPath();

    await requestReturn("order-1", { userId: "u-1" }, "Arrived damaged");

    expect(mocks.txCreateAudit).toHaveBeenCalledTimes(1);
    expect(mocks.txCreateAudit).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: "order-1",
        actorId: "u-1",
        action: RETURN_REQUESTED_ACTION,
        fromStatus: null,
        toStatus: null,
      }),
    });
  });

  it("maps a P2002 unique race to DuplicateReturnError with no audit write", async () => {
    wireHappyPath();
    mocks.txCreateReturn.mockRejectedValue(prismaError("P2002"));

    await expect(
      requestReturn("order-1", { userId: "u-1" }, "Too small"),
    ).rejects.toThrow(DuplicateReturnError);
    expect(mocks.txCreateAudit).not.toHaveBeenCalled();
  });

  it("validates the reason before touching the database", async () => {
    wireHappyPath();

    await expect(
      requestReturn("order-1", { userId: "u-1" }, "   "),
    ).rejects.toThrow(ReturnNotEligibleError);
    expect(mocks.topFindFirst).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
