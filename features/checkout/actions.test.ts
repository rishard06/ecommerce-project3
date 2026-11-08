import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/features/cart/server/quote-cart", () => {
  class MockCartQuoteError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "CartQuoteError";
    }
  }

  return {
    quoteCart: vi.fn(),
    CartQuoteError: MockCartQuoteError,
  };
});

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CartQuoteError,
  quoteCart,
} from "@/features/cart/server/quote-cart";
import { createOrderAction } from "./actions";
import type { CartItemInput, CartQuote } from "@/features/cart/types";
import type { ShippingAddress } from "./types";

const getSession = vi.mocked(auth.api.getSession);
const createOrder = vi.mocked(prisma.order.create);
const findUser = vi.mocked(prisma.user.findUnique);
const quoteCartMock = vi.mocked(quoteCart);

const SHIPPING: ShippingAddress = {
  firstName: "Jane",
  lastName: "Doe",
  address: "123 Main Street",
  city: "Springfield",
  postalCode: "12345",
  country: "US",
};

const CART: CartItemInput[] = [{ variantId: "variant-1", quantity: 2 }];

const QUOTE: CartQuote = {
  items: [
    {
      variantId: "variant-1",
      productSlug: "dummy-1",
      title: "Wireless Headphones",
      sku: "dummy-1",
      unitPriceCents: 1999,
      quantity: 2,
      lineTotalCents: 3998,
    },
  ],
  subtotalCents: 3998,
  shippingCents: 0,
  taxCents: 60,
  totalCents: 4058,
  currency: "USD",
};

function mockSession(userId: string) {
  getSession.mockResolvedValue({
    session: { id: "session-1", userId },
    user: {
      id: userId,
      name: "Owner",
      email: "owner@example.com",
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  } as never);
  findUser.mockResolvedValue({
    id: userId,
    name: "Owner",
    email: "owner@example.com",
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    role: "CUSTOMER",
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createOrderAction", () => {
  it("returns Unauthorized when there is no session and never quotes or writes", async () => {
    getSession.mockResolvedValue(null);

    const result = await createOrderAction(SHIPPING, "stripe", CART);

    expect(result).toEqual({ success: false, error: "Unauthorized" });
    expect(quoteCartMock).not.toHaveBeenCalled();
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("persists the session user's id even when the caller supplies another user id", async () => {
    mockSession("owner-1");
    quoteCartMock.mockResolvedValue(QUOTE);
    createOrder.mockResolvedValue({ id: "order-1" } as never);

    // The attacker smuggles a different userId into the shipping payload.
    const attackerShipping = { ...SHIPPING, userId: "attacker-1" } as ShippingAddress;

    const result = await createOrderAction(attackerShipping, "stripe", CART);

    expect(result).toEqual({
      success: true,
      orderId: "order-1",
      subtotalCents: 3998,
      taxCents: 60,
      totalCents: 4058,
    });
    expect(quoteCartMock).toHaveBeenCalledTimes(1);
    expect(createOrder).toHaveBeenCalledTimes(1);
    expect(createOrder).toHaveBeenCalledWith({
      data: {
        userId: "owner-1",
        status: "PENDING",
        currency: "USD",
        subtotalCents: 3998,
        shippingCents: 0,
        taxCents: 60,
        totalCents: 4058,
        shippingFullName: "Jane Doe",
        shippingLine1: "123 Main Street",
        shippingCity: "Springfield",
        shippingRegion: "",
        shippingPostalCode: "12345",
        shippingCountry: "US",
        items: {
          create: [
            {
              variantId: "variant-1",
              productSlug: "dummy-1",
              title: "Wireless Headphones",
              sku: "dummy-1",
              unitPriceCents: 1999,
              quantity: 2,
              lineTotalCents: 3998,
            },
          ],
        },
      },
    });

    const persisted = vi.mocked(createOrder.mock.calls[0][0]);
    expect(persisted.data.userId).not.toBe("attacker-1");
  });

  it("never trusts a user id smuggled through cart items", async () => {
    mockSession("owner-1");
    quoteCartMock.mockResolvedValue(QUOTE);
    createOrder.mockResolvedValue({ id: "order-2" } as never);

    const forgedItems = [
      { variantId: "variant-1", quantity: 2, userId: "attacker-1" },
    ] as unknown as CartItemInput[];

    await createOrderAction(SHIPPING, "stripe", forgedItems);

    expect(createOrder).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "owner-1" }),
    });
    const persisted = vi.mocked(createOrder.mock.calls[0][0]);
    expect(JSON.stringify(persisted)).not.toContain("attacker-1");
  });

  it("returns a validation error and never quotes or writes when shipping is invalid", async () => {
    mockSession("owner-1");

    const result = await createOrderAction(
      { ...SHIPPING, city: "" },
      "stripe",
      CART,
    );

    expect(result).toEqual({ success: false, error: "City is required" });
    expect(quoteCartMock).not.toHaveBeenCalled();
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("returns the quote error and never writes when the cart quote fails", async () => {
    mockSession("owner-1");
    quoteCartMock.mockRejectedValue(
      new CartQuoteError("Variant variant-1 is not available"),
    );

    const result = await createOrderAction(SHIPPING, "stripe", CART);

    expect(result).toEqual({
      success: false,
      error: "Variant variant-1 is not available",
    });
    expect(createOrder).not.toHaveBeenCalled();
  });
});
