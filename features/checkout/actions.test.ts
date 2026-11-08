import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    productVariant: {
      findMany: vi.fn(),
    },
    order: {
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/features/identity/server/guards", () => {
  class MockUnauthorizedError extends Error {
    constructor() {
      super("Unauthorized");
      this.name = "UnauthorizedError";
    }
  }

  class MockForbiddenError extends Error {
    constructor() {
      super("Forbidden");
      this.name = "ForbiddenError";
    }
  }

  return {
    requireUser: vi.fn(),
    UnauthorizedError: MockUnauthorizedError,
    ForbiddenError: MockForbiddenError,
  };
});

vi.mock("./server/create-pending-order", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("./server/create-pending-order")>();
  return {
    ...actual,
    createPendingOrder: vi.fn(),
  };
});

import { requireUser, UnauthorizedError } from "@/features/identity/server/guards";
import { CartQuoteError } from "@/features/cart/server/quote-cart";
import {
  createPendingOrder,
  InsufficientStockError,
} from "./server/create-pending-order";
import { createOrderAction } from "./actions";

const requireUserMock = vi.mocked(requireUser);
const createPendingOrderMock = vi.mocked(createPendingOrder);

const SESSION_USER = {
  id: "owner-1",
  email: "owner@example.com",
  role: "CUSTOMER" as const,
};

const INPUT = {
  items: [{ variantId: "variant-1", quantity: 2 }],
  shipping: {
    fullName: "Jane Doe",
    line1: "123 Main Street",
    city: "Springfield",
    region: "IL",
    postalCode: "62701",
    country: "US",
  },
  idempotencyKey: "key-1",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createOrderAction", () => {
  it("returns Unauthorized when there is no session and never creates an order", async () => {
    requireUserMock.mockRejectedValue(new UnauthorizedError());

    const result = await createOrderAction(INPUT);

    expect(result).toEqual({ success: false, error: "Unauthorized" });
    expect(createPendingOrderMock).not.toHaveBeenCalled();
  });

  it("passes the session user's id even when the caller supplies another user id", async () => {
    requireUserMock.mockResolvedValue(SESSION_USER);
    createPendingOrderMock.mockResolvedValue({ orderId: "order-1" });

    // The attacker smuggles a different userId into both payloads.
    const attackerInput = {
      ...INPUT,
      shipping: { ...INPUT.shipping, userId: "attacker-1" },
      items: [{ ...INPUT.items[0], userId: "attacker-1" }],
    } as unknown as typeof INPUT;

    const result = await createOrderAction(attackerInput);

    expect(result).toEqual({ success: true, orderId: "order-1" });
    expect(createPendingOrderMock).toHaveBeenCalledTimes(1);
    expect(createPendingOrderMock).toHaveBeenCalledWith({
      userId: "owner-1",
      items: [{ variantId: "variant-1", quantity: 2 }],
      shipping: INPUT.shipping,
      idempotencyKey: "key-1",
    });

    const persisted = createPendingOrderMock.mock.calls[0][0];
    expect(persisted.userId).toBe("owner-1");
    expect(persisted.userId).not.toBe("attacker-1");
    expect(JSON.stringify(persisted)).not.toContain("attacker-1");
  });

  it("returns a validation error and never creates an order when shipping is invalid", async () => {
    requireUserMock.mockResolvedValue(SESSION_USER);

    const result = await createOrderAction({
      ...INPUT,
      shipping: { ...INPUT.shipping, city: "" },
    });

    expect(result).toEqual({ success: false, error: "City is required" });
    expect(createPendingOrderMock).not.toHaveBeenCalled();
  });

  it("returns a validation error and never creates an order when the cart is empty", async () => {
    requireUserMock.mockResolvedValue(SESSION_USER);

    const result = await createOrderAction({ ...INPUT, items: [] });

    expect(result).toEqual({ success: false, error: "Cart is empty" });
    expect(createPendingOrderMock).not.toHaveBeenCalled();
  });

  it("returns a validation error and never creates an order without an idempotency key", async () => {
    requireUserMock.mockResolvedValue(SESSION_USER);

    const result = await createOrderAction({ ...INPUT, idempotencyKey: "" });

    expect(result).toEqual({
      success: false,
      error: "Idempotency key is required",
    });
    expect(createPendingOrderMock).not.toHaveBeenCalled();
  });

  it("returns a stock error message when the transaction rejects", async () => {
    requireUserMock.mockResolvedValue(SESSION_USER);
    createPendingOrderMock.mockRejectedValue(
      new InsufficientStockError("variant-1"),
    );

    const result = await createOrderAction(INPUT);

    expect(result).toEqual({
      success: false,
      error: "Insufficient stock for variant variant-1",
    });
  });

  it("returns the quote error message when the cart cannot be priced", async () => {
    requireUserMock.mockResolvedValue(SESSION_USER);
    createPendingOrderMock.mockRejectedValue(
      new CartQuoteError("Variant variant-1 is not available"),
    );

    const result = await createOrderAction(INPUT);

    expect(result).toEqual({
      success: false,
      error: "Variant variant-1 is not available",
    });
  });
});
