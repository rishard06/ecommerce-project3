import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  stripeCreate: vi.fn(),
  orderFindUnique: vi.fn(),
  paymentUpdate: vi.fn(),
}));

vi.mock("./stripe-client", () => ({
  getStripe: () => ({
    checkout: {
      sessions: {
        create: mocks.stripeCreate,
      },
    },
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      findUnique: mocks.orderFindUnique,
    },
    payment: {
      update: mocks.paymentUpdate,
    },
  },
}));

const { createCheckoutSession, CheckoutSessionError } = await import(
  "./create-checkout-session"
);

const ORDER = {
  id: "order-1",
  userId: "user-1",
  status: "PENDING" as const,
  currency: "USD",
  subtotalCents: 4498,
  shippingCents: 0,
  taxCents: 67,
  totalCents: 4565,
  items: [
    {
      id: "item-1",
      orderId: "order-1",
      variantId: "variant-1",
      productSlug: "wireless-headphones",
      sku: "SKU-HEADPHONES",
      title: "Wireless Headphones",
      unitPriceCents: 1999,
      quantity: 2,
      lineTotalCents: 3998,
    },
    {
      id: "item-2",
      orderId: "order-1",
      variantId: "variant-2",
      productSlug: "usb-c-cable",
      sku: "SKU-CABLE",
      title: "USB-C Cable",
      unitPriceCents: 500,
      quantity: 1,
      lineTotalCents: 500,
    },
  ],
  payment: {
    id: "payment-1",
    orderId: "order-1",
    provider: "stripe",
    providerSessionId: null,
    status: "PENDING" as const,
    amountCents: 4565,
    currency: "USD",
  },
};

const SESSION = {
  id: "cs_test_123",
  url: "https://checkout.stripe.com/c/pay/cs_test_123",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.orderFindUnique.mockResolvedValue(ORDER);
  mocks.stripeCreate.mockResolvedValue(SESSION);
  mocks.paymentUpdate.mockResolvedValue({});
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("createCheckoutSession", () => {
  it("builds hosted Checkout from the stored order snapshots", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://store.example/");

    const result = await createCheckoutSession("order-1");

    expect(mocks.orderFindUnique).toHaveBeenCalledWith({
      where: { id: "order-1" },
      include: { items: true, payment: true },
    });

    expect(mocks.stripeCreate).toHaveBeenCalledWith(
      {
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: 1999,
              product_data: {
                name: "Wireless Headphones",
                description: "SKU-HEADPHONES",
              },
            },
            quantity: 2,
          },
          {
            price_data: {
              currency: "usd",
              unit_amount: 500,
              product_data: {
                name: "USB-C Cable",
                description: "SKU-CABLE",
              },
            },
            quantity: 1,
          },
        ],
        client_reference_id: "order-1",
        metadata: { orderId: "order-1" },
        payment_intent_data: { metadata: { orderId: "order-1" } },
        success_url:
          "https://store.example/checkout/success?orderId=order-1",
        cancel_url: "https://store.example/checkout/cancel?orderId=order-1",
      },
      { idempotencyKey: "checkout-order-1" },
    );

    expect(mocks.paymentUpdate).toHaveBeenCalledWith({
      where: { orderId: "order-1" },
      data: { providerSessionId: "cs_test_123" },
    });
    expect(result).toEqual({ url: SESSION.url });
  });

  it("falls back to localhost when no app URL is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", undefined);

    mocks.orderFindUnique.mockResolvedValue(ORDER);

    await createCheckoutSession("order-1");

    expect(mocks.stripeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: "http://localhost:3000/checkout/success?orderId=order-1",
        cancel_url: "http://localhost:3000/checkout/cancel?orderId=order-1",
      }),
      expect.anything(),
    );
  });

  it("uses a stable idempotency key for the order", async () => {
    await createCheckoutSession("order-1");
    await createCheckoutSession("order-1");

    expect(mocks.stripeCreate).toHaveBeenCalledTimes(2);
    expect(mocks.stripeCreate.mock.calls[0][1]).toEqual({
      idempotencyKey: "checkout-order-1",
    });
    expect(mocks.stripeCreate.mock.calls[1][1]).toEqual({
      idempotencyKey: "checkout-order-1",
    });
  });

  it("rejects a session without a hosted checkout URL and does not persist it", async () => {
    mocks.stripeCreate.mockResolvedValue({ id: "cs_test_no_url", url: null });

    await expect(createCheckoutSession("order-1")).rejects.toBeInstanceOf(
      CheckoutSessionError,
    );
    await expect(createCheckoutSession("order-1")).rejects.toThrow(
      "Unable to start checkout",
    );

    expect(mocks.paymentUpdate).not.toHaveBeenCalled();
  });

  it("rejects an order that is no longer pending", async () => {
    mocks.orderFindUnique.mockResolvedValue({ ...ORDER, status: "PAID" });

    await expect(createCheckoutSession("order-1")).rejects.toBeInstanceOf(
      CheckoutSessionError,
    );
    expect(mocks.stripeCreate).not.toHaveBeenCalled();
    expect(mocks.paymentUpdate).not.toHaveBeenCalled();
  });

  it("rejects an unknown order", async () => {
    mocks.orderFindUnique.mockResolvedValue(null);

    await expect(createCheckoutSession("missing-order")).rejects.toBeInstanceOf(
      CheckoutSessionError,
    );
    expect(mocks.stripeCreate).not.toHaveBeenCalled();
  });

  it("rejects a payment that is not pending", async () => {
    mocks.orderFindUnique.mockResolvedValue({
      ...ORDER,
      payment: { ...ORDER.payment, status: "SUCCEEDED" },
    });

    await expect(createCheckoutSession("order-1")).rejects.toBeInstanceOf(
      CheckoutSessionError,
    );
    expect(mocks.stripeCreate).not.toHaveBeenCalled();
  });

  it("rejects an order without a payment record", async () => {
    mocks.orderFindUnique.mockResolvedValue({ ...ORDER, payment: null });

    await expect(createCheckoutSession("order-1")).rejects.toBeInstanceOf(
      CheckoutSessionError,
    );
    expect(mocks.stripeCreate).not.toHaveBeenCalled();
  });

  it("rejects a payment amount that does not match the order total", async () => {
    mocks.orderFindUnique.mockResolvedValue({
      ...ORDER,
      payment: { ...ORDER.payment, amountCents: 1 },
    });

    await expect(createCheckoutSession("order-1")).rejects.toBeInstanceOf(
      CheckoutSessionError,
    );
    expect(mocks.stripeCreate).not.toHaveBeenCalled();
  });
});
