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

vi.mock(
  "@/features/payments/server/create-checkout-session",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/features/payments/server/create-checkout-session")
      >();
    return {
      ...actual,
      createCheckoutSession: vi.fn(),
    };
  },
);

vi.mock("@/features/cart/server/quote-cart", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/cart/server/quote-cart")>();
  return {
    ...actual,
    quoteCart: vi.fn(),
  };
});

import {
  ForbiddenError,
  requireUser,
  UnauthorizedError,
} from "@/features/identity/server/guards";
import { CartQuoteError, quoteCart } from "@/features/cart/server/quote-cart";
import type { CartQuote } from "@/features/cart/types";
import {
  createPendingOrder,
  InsufficientStockError,
} from "./server/create-pending-order";
import {
  CheckoutSessionError,
  createCheckoutSession,
} from "@/features/payments/server/create-checkout-session";
import {
  createCheckoutAttempt,
  getReviewTotals,
  getReviewTotalsDisplay,
  parseStoredShippingForm,
  shippingFormFromSavedAddress,
  toShippingInput,
} from "./preamble";
import { quoteCheckoutAction, startCheckoutAction } from "./actions";

const requireUserMock = vi.mocked(requireUser);
const createPendingOrderMock = vi.mocked(createPendingOrder);
const createCheckoutSessionMock = vi.mocked(createCheckoutSession);
const quoteCartMock = vi.mocked(quoteCart);

const SESSION_USER = {
  id: "owner-1",
  email: "owner@example.com",
  role: "CUSTOMER" as const,
};

const CHECKOUT_URL = "https://checkout.stripe.com/c/pay/cs_test_123";

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

const SHIPPING_FORM = {
  firstName: "Jane",
  lastName: "Doe",
  address: "123 Main Street",
  line2: "Apt 4B",
  city: "Springfield",
  region: "IL",
  postalCode: "62701",
  country: "United States",
};

const QUOTE: CartQuote = {
  items: [
    {
      variantId: "variant-1",
      productSlug: "demo-product",
      title: "Server-priced jacket",
      sku: "dummy-1",
      unitPriceCents: 2100,
      quantity: 2,
      lineTotalCents: 4200,
    },
  ],
  subtotalCents: 4200,
  shippingCents: 0,
  taxCents: 63,
  totalCents: 4263,
  currency: "USD",
};

beforeEach(() => {
  vi.clearAllMocks();
  createPendingOrderMock.mockResolvedValue({ orderId: "order-1" });
  createCheckoutSessionMock.mockResolvedValue({ url: CHECKOUT_URL });
});

describe("startCheckoutAction", () => {
  it("returns Unauthorized when there is no session and never creates an order", async () => {
    requireUserMock.mockRejectedValue(new UnauthorizedError());

    const result = await startCheckoutAction(INPUT);

    expect(result).toEqual({ success: false, error: "Unauthorized" });
    expect(createPendingOrderMock).not.toHaveBeenCalled();
    expect(createCheckoutSessionMock).not.toHaveBeenCalled();
  });

  it("returns Forbidden when the session lacks permission", async () => {
    requireUserMock.mockRejectedValue(new ForbiddenError());

    const result = await startCheckoutAction(INPUT);

    expect(result).toEqual({ success: false, error: "Forbidden" });
    expect(createPendingOrderMock).not.toHaveBeenCalled();
    expect(createCheckoutSessionMock).not.toHaveBeenCalled();
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

    const result = await startCheckoutAction(attackerInput);

    expect(result).toEqual({
      success: true,
      url: CHECKOUT_URL,
      orderId: "order-1",
    });
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

  it("starts checkout for the pending order only after creating it", async () => {
    requireUserMock.mockResolvedValue(SESSION_USER);

    const result = await startCheckoutAction(INPUT);

    expect(result).toEqual({
      success: true,
      url: CHECKOUT_URL,
      orderId: "order-1",
    });
    expect(createCheckoutSessionMock).toHaveBeenCalledWith("order-1");
    expect(
      createPendingOrderMock.mock.invocationCallOrder[0],
    ).toBeLessThan(createCheckoutSessionMock.mock.invocationCallOrder[0]);
  });

  it("returns a validation error and never creates an order when shipping is invalid", async () => {
    requireUserMock.mockResolvedValue(SESSION_USER);

    const result = await startCheckoutAction({
      ...INPUT,
      shipping: { ...INPUT.shipping, city: "" },
    });

    expect(result).toEqual({ success: false, error: "City is required" });
    expect(createPendingOrderMock).not.toHaveBeenCalled();
    expect(createCheckoutSessionMock).not.toHaveBeenCalled();
  });

  it("returns a validation error and never creates an order when the cart is empty", async () => {
    requireUserMock.mockResolvedValue(SESSION_USER);

    const result = await startCheckoutAction({ ...INPUT, items: [] });

    expect(result).toEqual({ success: false, error: "Cart is empty" });
    expect(createPendingOrderMock).not.toHaveBeenCalled();
    expect(createCheckoutSessionMock).not.toHaveBeenCalled();
  });

  it("returns a validation error and never creates an order without an idempotency key", async () => {
    requireUserMock.mockResolvedValue(SESSION_USER);

    const result = await startCheckoutAction({ ...INPUT, idempotencyKey: "" });

    expect(result).toEqual({
      success: false,
      error: "Idempotency key is required",
    });
    expect(createPendingOrderMock).not.toHaveBeenCalled();
    expect(createCheckoutSessionMock).not.toHaveBeenCalled();
  });

  it("returns a stock error message when the transaction rejects", async () => {
    requireUserMock.mockResolvedValue(SESSION_USER);
    createPendingOrderMock.mockRejectedValue(
      new InsufficientStockError("variant-1"),
    );

    const result = await startCheckoutAction(INPUT);

    expect(result).toEqual({
      success: false,
      error: "Insufficient stock for variant variant-1",
    });
    expect(createCheckoutSessionMock).not.toHaveBeenCalled();
  });

  it("returns the quote error message when the cart cannot be priced", async () => {
    requireUserMock.mockResolvedValue(SESSION_USER);
    createPendingOrderMock.mockRejectedValue(
      new CartQuoteError("Variant variant-1 is not available"),
    );

    const result = await startCheckoutAction(INPUT);

    expect(result).toEqual({
      success: false,
      error: "Variant variant-1 is not available",
    });
    expect(createCheckoutSessionMock).not.toHaveBeenCalled();
  });

  it("returns the safe checkout error when Stripe cannot start a session", async () => {
    requireUserMock.mockResolvedValue(SESSION_USER);
    createCheckoutSessionMock.mockRejectedValue(
      new CheckoutSessionError("Unable to start checkout"),
    );

    const result = await startCheckoutAction(INPUT);

    expect(result).toEqual({
      success: false,
      error: "Unable to start checkout",
    });
  });

  it("hides unexpected failures behind a generic message", async () => {
    requireUserMock.mockResolvedValue(SESSION_USER);
    createCheckoutSessionMock.mockRejectedValue(
      new Error("stripe secret sk_test_leaked"),
    );

    const result = await startCheckoutAction(INPUT);

    expect(result).toEqual({
      success: false,
      error: "An unexpected error occurred. Please try again.",
    });
  });
});

describe("checkout preamble mapping", () => {
  it("maps firstName+lastName to fullName, address to line1, and passes region through", () => {
    expect(toShippingInput(SHIPPING_FORM)).toEqual({
      fullName: "Jane Doe",
      line1: "123 Main Street",
      line2: "Apt 4B",
      city: "Springfield",
      region: "IL",
      postalCode: "62701",
      country: "United States",
    });
  });

  it("omits an empty line2 instead of persisting a blank address line", () => {
    const shipping = toShippingInput({ ...SHIPPING_FORM, line2: "   " });

    expect(shipping.line2).toBeUndefined();
    expect(shipping.region).toBe("IL");
  });

  it("maps a saved address into the form and keeps the production region", () => {
    expect(
      shippingFormFromSavedAddress({
        id: "address-1",
        userId: "owner-1",
        fullName: "Jane Doe",
        line1: "123 Main Street",
        line2: null,
        city: "Springfield",
        region: "IL",
        postalCode: "62701",
        country: "United States",
        isDefault: true,
      }),
    ).toEqual({ ...SHIPPING_FORM, line2: "" });
  });

  it("uses quoteCart cents for review totals instead of form-side estimates", () => {
    // A stale client estimate would price the same cart differently.
    const clientEstimateCents = 9999;

    const totals = getReviewTotals(QUOTE);

    expect(totals).toEqual({
      subtotalCents: 4200,
      shippingCents: 0,
      taxCents: 63,
      totalCents: 4263,
    });
    expect(totals.totalCents).not.toBe(clientEstimateCents);
  });

  it("restores the same shipping inputs after a full-page navigation", () => {
    const restored = parseStoredShippingForm(JSON.stringify(SHIPPING_FORM));

    expect(restored).toEqual(SHIPPING_FORM);
    expect(toShippingInput(restored!)).toEqual(
      toShippingInput(SHIPPING_FORM),
    );
  });

  it("ignores missing or corrupt persisted shipping state", () => {
    expect(parseStoredShippingForm(null)).toBeNull();
    expect(parseStoredShippingForm("{not-json")).toBeNull();
    expect(parseStoredShippingForm(JSON.stringify({ region: 1 }))).toBeNull();
  });
});

describe("createCheckoutAttempt", () => {
  it("blocks a second submit while the first is pending and keeps the key stable", () => {
    const attempt = createCheckoutAttempt(() => "stable-key");

    expect(attempt.begin()).toBe(true);
    expect(attempt.begin()).toBe(false);
    expect(attempt.idempotencyKey).toBe("stable-key");

    attempt.finish();

    expect(attempt.begin()).toBe(true);
    expect(attempt.idempotencyKey).toBe("stable-key");
  });
});

describe("quoteCheckoutAction", () => {
  it("returns the server quote snapshot used by the review step", async () => {
    quoteCartMock.mockResolvedValue(QUOTE);

    const result = await quoteCheckoutAction(INPUT.items);

    expect(result).toEqual({ success: true, quote: QUOTE });
    expect(quoteCartMock).toHaveBeenCalledWith(INPUT.items);
  });

  it("maps cart quote failures to a review error", async () => {
    quoteCartMock.mockRejectedValue(
      new CartQuoteError("Variant variant-1 is not available"),
    );

    const result = await quoteCheckoutAction(INPUT.items);

    expect(result).toEqual({
      success: false,
      error: "Variant variant-1 is not available",
    });
  });
});

describe("ReviewStep totals", () => {
  it("renders quoteCart cents, not form-derived estimates", () => {
    const display = getReviewTotalsDisplay(QUOTE);

    expect(display).toEqual({
      subtotal: "$42.00",
      shipping: "Free",
      tax: "$0.63",
      total: "$42.63",
    });
    expect(display.total).not.toBe("$99.99");
    expect(display.total).not.toBe("$42.00");
  });
});
