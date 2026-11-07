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

vi.mock("@/lib/price-validation", () => ({
  validateCartPrices: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateCartPrices, type CartItemInput } from "@/lib/price-validation";
import { createOrderAction } from "./actions";
import type { ShippingAddress } from "./types";

const getSession = vi.mocked(auth.api.getSession);
const createOrder = vi.mocked(prisma.order.create);
const findUser = vi.mocked(prisma.user.findUnique);
const validateCartPricesMock = vi.mocked(validateCartPrices);

const SHIPPING: ShippingAddress = {
  firstName: "Jane",
  lastName: "Doe",
  address: "123 Main Street",
  city: "Springfield",
  postalCode: "12345",
  country: "US",
};

const CART: CartItemInput[] = [{ id: 1, quantity: 2 }];

const VALIDATED_CART = {
  success: true,
  validatedItems: [
    { id: 1, title: "Product 1", price: 49.99, quantity: 2 },
  ],
  subtotal: 99.98,
  tax: 1.4997,
  total: 101.4797,
};

beforeEach(() => {
  vi.clearAllMocks();
});

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

describe("createOrderAction", () => {
  it("returns Unauthorized when there is no session and never writes", async () => {
    getSession.mockResolvedValue(null);

    const result = await createOrderAction(SHIPPING, "stripe", CART);

    expect(result).toEqual({ success: false, error: "Unauthorized" });
    expect(createOrder).not.toHaveBeenCalled();
    expect(validateCartPricesMock).not.toHaveBeenCalled();
  });

  it("persists the session user's id even when the caller supplies another user id", async () => {
    mockSession("owner-1");
    validateCartPricesMock.mockResolvedValue(VALIDATED_CART);
    createOrder.mockResolvedValue({ id: "order-1" } as never);

    // The attacker smuggles a different userId into the input payload.
    const attackerShipping = { ...SHIPPING, userId: "attacker-1" } as ShippingAddress;

    const result = await createOrderAction(attackerShipping, "stripe", CART);

    expect(result).toEqual(
      expect.objectContaining({ success: true, orderId: "order-1" }),
    );
    expect(createOrder).toHaveBeenCalledTimes(1);
    expect(createOrder).toHaveBeenCalledWith({
      data: {
        userId: "owner-1",
        totalAmount: VALIDATED_CART.total,
        items: {
          create: [
            {
              productId: 1,
              title: "Product 1",
              price: 49.99,
              quantity: 2,
            },
          ],
        },
      },
    });

    const persisted = vi.mocked(createOrder.mock.calls[0][0]);
    expect(persisted.data.userId).not.toBe("attacker-1");
  });

  it("rejects ownership escalation when the items carry a forged userId", async () => {
    mockSession("owner-1");
    validateCartPricesMock.mockResolvedValue(VALIDATED_CART);
    createOrder.mockResolvedValue({ id: "order-2" } as never);

    const forgedItems = [
      { id: 1, quantity: 2, userId: "attacker-1" },
    ] as unknown as CartItemInput[];

    await createOrderAction(SHIPPING, "stripe", forgedItems);

    expect(createOrder).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "owner-1" }),
    });
  });
});
