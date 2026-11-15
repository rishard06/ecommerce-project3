import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Task 13 RED: admin cancel + Stripe refund.
 *
 * Covers `refundPayment` (not yet implemented — this file must FAIL before
 * the service exists) and the terminal-order fulfillment guard:
 *
 * 1. A PAID order with a Stripe payment intent triggers exactly one
 *    `stripe.refunds.create` with `idempotencyKey: refund-{orderId}`.
 * 2. A retry after the refund is a no-op (no second Stripe call).
 * 3. PENDING / zero-total / intent-less orders never reach Stripe.
 * 4. A successful admin refund returns the coupon use (usedCount - 1).
 * 5. Fulfillment transitions on CANCELLED orders are refused, so legacy
 *    expiry-cancelled rows (CANCELLED + UNFULFILLED) can never be shipped.
 */

const mocks = vi.hoisted(() => ({
  refundsCreate: vi.fn(),
}));

vi.mock("@/features/payments/server/stripe-client", () => ({
  getStripe: () => ({
    refunds: {
      create: mocks.refundsCreate,
    },
  }),
}));

import { PrismaClient } from "@/app/generated/prisma";

/**
 * Loads the disposable test database URL. Tests must never fall back to the
 * application database: if `DATABASE_URL_TEST` is missing or points at the
 * same server/database as `DATABASE_URL`, the suite fails before any query.
 */
function loadTestDatabaseUrl(): string {
  try {
    process.loadEnvFile?.(".env");
  } catch {
    // `.env` is optional; the test URL may be provided by the shell.
  }

  const testUrl = process.env.DATABASE_URL_TEST;
  if (!testUrl) {
    throw new Error(
      "DATABASE_URL_TEST must be set to the disposable test database URL.",
    );
  }
  if (testUrl === process.env.DATABASE_URL) {
    throw new Error(
      "Refusing to run database tests: DATABASE_URL_TEST matches DATABASE_URL.",
    );
  }
  return testUrl;
}

const testDatabaseUrl = loadTestDatabaseUrl();
// Point the application singleton at the same disposable database. This is set
// before the service module (and therefore `lib/prisma`) is imported below.
process.env.DATABASE_URL = testDatabaseUrl;

// Test files share one disposable database, so serialize them with a
// PostgreSQL advisory lock. A single pooled connection guarantees the session
// holding the lock stays alive until `afterAll`.
const testPrisma = new PrismaClient({
  datasourceUrl: `${testDatabaseUrl}${testDatabaseUrl.includes("?") ? "&" : "?"}connection_limit=1`,
});

const TEST_DATABASE_LOCK_KEY = 728674001;

const {
  InvalidFulfillmentTransitionError,
  OrderNotFoundError,
  OrderNotRefundableError,
  canRefund,
  refundPayment,
  updateFulfillment,
} = await import("./admin-order-service");

const SHIPPING = {
  fullName: "Jane Doe",
  line1: "123 Main Street",
  line2: "Apt 4",
  city: "Springfield",
  region: "IL",
  postalCode: "62701",
  country: "US",
};

let sequence = 0;
function nextToken(prefix: string): string {
  sequence += 1;
  return `${prefix}-${sequence}`;
}

async function createUser(role: "CUSTOMER" | "ADMIN" = "CUSTOMER") {
  const id = nextToken("user");
  return testPrisma.user.create({
    data: {
      id,
      name: "Test User",
      email: `${id}@example.com`,
      emailVerified: true,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

async function createVariant() {
  const token = nextToken("fixture");
  const category = await testPrisma.category.create({
    data: { slug: `category-${token}`, name: "Test Category" },
  });
  const product = await testPrisma.product.create({
    data: {
      slug: `product-${token}`,
      title: `Product ${token}`,
      description: "Test product",
      status: "ACTIVE",
      categoryId: category.id,
    },
  });
  return testPrisma.productVariant.create({
    data: {
      productId: product.id,
      sku: `sku-${token}`,
      name: "Default",
      priceCents: 1999,
      onHand: 10,
    },
  });
}

interface PaidOrderFixtureOptions {
  fulfillmentStatus?: "UNFULFILLED" | "PROCESSING" | "SHIPPED" | "CANCELLED";
  withIntent?: boolean;
  withReservation?: boolean;
}

/**
 * Mirrors production paid state: the payment commit moved
 * ACTIVE -> COMMITTED and `onHand` 10 -> 8 (`reserved` back to 0).
 */
async function createPaidOrder(options: PaidOrderFixtureOptions = {}) {
  const customer = await createUser();
  const variant = options.withReservation === false ? null : await createVariant();
  const withIntent = options.withIntent !== false;

  const order = await testPrisma.order.create({
    data: {
      userId: customer.id,
      status: "PAID",
      fulfillmentStatus: options.fulfillmentStatus ?? "UNFULFILLED",
      currency: "USD",
      subtotalCents: 3998,
      shippingCents: 500,
      taxCents: 320,
      totalCents: 4818,
      shippingFullName: SHIPPING.fullName,
      shippingLine1: SHIPPING.line1,
      shippingLine2: SHIPPING.line2,
      shippingCity: SHIPPING.city,
      shippingRegion: SHIPPING.region,
      shippingPostalCode: SHIPPING.postalCode,
      shippingCountry: SHIPPING.country,
      items: {
        create: [
          {
            variantId: variant?.id ?? null,
            productSlug: "product-slug",
            sku: "sku-1",
            title: "Snapshot product",
            unitPriceCents: 1999,
            quantity: 2,
            lineTotalCents: 3998,
          },
        ],
      },
      payment: {
        create: {
          status: "SUCCEEDED",
          provider: "stripe",
          providerPaymentIntentId: withIntent
            ? `pi_${nextToken("intent")}`
            : null,
          amountCents: 4818,
          currency: "USD",
        },
      },
    },
  });

  let reservation = null;
  if (variant) {
    reservation = await testPrisma.reservation.create({
      data: {
        orderId: order.id,
        variantId: variant.id,
        quantity: 2,
        status: "COMMITTED",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    await testPrisma.productVariant.update({
      where: { id: variant.id },
      data: { onHand: 8, reserved: 0 },
    });
  }

  return { order, reservation, variant };
}

beforeEach(async () => {
  mocks.refundsCreate.mockReset();
  mocks.refundsCreate.mockResolvedValue({ id: "re_test_123" });

  // Foreign-key order matters: children before parents.
  await testPrisma.orderAuditLog.deleteMany();
  await testPrisma.reservation.deleteMany();
  await testPrisma.payment.deleteMany();
  await testPrisma.orderItem.deleteMany();
  await testPrisma.order.deleteMany();
  await testPrisma.webhookEvent.deleteMany();
  await testPrisma.coupon.deleteMany();
  await testPrisma.productImage.deleteMany();
  await testPrisma.productVariant.deleteMany();
  await testPrisma.product.deleteMany();
  await testPrisma.category.deleteMany();
  await testPrisma.user.deleteMany();
});

beforeAll(async () => {
  await testPrisma.$queryRawUnsafe(
    `WITH lock AS (SELECT pg_advisory_lock(${TEST_DATABASE_LOCK_KEY})) SELECT 1 AS locked FROM lock`,
  );
});

afterAll(async () => {
  await testPrisma.$queryRawUnsafe(
    `SELECT pg_advisory_unlock(${TEST_DATABASE_LOCK_KEY}) AS unlocked`,
  );
  await testPrisma.$disconnect();
});

// DB-backed refund tests each perform 10+ sequential round trips to the
// disposable database, so they carry an explicit timeout instead of relying
// on the 5s default (a hang/deadlock would still exceed this quickly).
const REFUND_TEST_TIMEOUT = 30_000;

describe("refundPayment", () => {
  it("refunds a PAID order with one Stripe call, cancels order+payment, restocks, and audits", { timeout: REFUND_TEST_TIMEOUT }, async () => {
    const admin = await createUser("ADMIN");
    const { order, reservation, variant } = await createPaidOrder();
    const payment = await testPrisma.payment.findUniqueOrThrow({
      where: { orderId: order.id },
    });

    const result = await refundPayment(order.id, admin.id);

    expect(result).toEqual({ refunded: true });
    expect(mocks.refundsCreate).toHaveBeenCalledTimes(1);
    expect(mocks.refundsCreate).toHaveBeenCalledWith(
      { payment_intent: payment.providerPaymentIntentId },
      { idempotencyKey: `refund-${order.id}` },
    );

    await expect(
      testPrisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).resolves.toMatchObject({ status: "CANCELLED", fulfillmentStatus: "CANCELLED" });
    // A refund is distinguishable from an expired hold: the payment reads
    // REFUNDED, never CANCELLED.
    await expect(
      testPrisma.payment.findUniqueOrThrow({ where: { orderId: order.id } }),
    ).resolves.toMatchObject({ status: "REFUNDED" });

    // The reversed sale restocks onHand and releases the hold.
    await expect(
      testPrisma.reservation.findUniqueOrThrow({
        where: { id: reservation!.id },
      }),
    ).resolves.toMatchObject({ status: "RELEASED" });
    await expect(
      testPrisma.productVariant.findUniqueOrThrow({
        where: { id: variant!.id },
      }),
    ).resolves.toMatchObject({ onHand: 10, reserved: 0 });

    const audits = await testPrisma.orderAuditLog.findMany({
      where: { orderId: order.id },
    });
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      actorId: admin.id,
      action: "ORDER_REFUNDED",
      fromStatus: "PAID",
      toStatus: "CANCELLED",
    });
  });

  it("is a no-op on retry: no second Stripe call, no duplicate audit", { timeout: REFUND_TEST_TIMEOUT }, async () => {
    const admin = await createUser("ADMIN");
    const { order } = await createPaidOrder();

    await refundPayment(order.id, admin.id);
    const retry = await refundPayment(order.id, admin.id);

    expect(retry).toEqual({ refunded: false });
    expect(mocks.refundsCreate).toHaveBeenCalledTimes(1);
    await expect(
      testPrisma.orderAuditLog.count({ where: { orderId: order.id } }),
    ).resolves.toBe(1);
  });

  it("refuses a PENDING order without calling Stripe and leaves every row untouched", { timeout: REFUND_TEST_TIMEOUT }, async () => {
    const admin = await createUser("ADMIN");
    const customer = await createUser();
    const pending = await testPrisma.order.create({
      data: {
        userId: customer.id,
        status: "PENDING",
        fulfillmentStatus: "UNFULFILLED",
        currency: "USD",
        subtotalCents: 3998,
        shippingCents: 500,
        taxCents: 320,
        totalCents: 4818,
        shippingFullName: SHIPPING.fullName,
        shippingLine1: SHIPPING.line1,
        shippingLine2: SHIPPING.line2,
        shippingCity: SHIPPING.city,
        shippingRegion: SHIPPING.region,
        shippingPostalCode: SHIPPING.postalCode,
        shippingCountry: SHIPPING.country,
        items: {
          create: [
            {
              variantId: null,
              productSlug: "product-slug",
              sku: "sku-1",
              title: "Snapshot product",
              unitPriceCents: 1999,
              quantity: 2,
              lineTotalCents: 3998,
            },
          ],
        },
        payment: {
          create: {
            status: "PENDING",
            provider: "stripe",
            amountCents: 4818,
            currency: "USD",
          },
        },
      },
    });

    await expect(refundPayment(pending.id, admin.id)).rejects.toThrow(
      OrderNotRefundableError,
    );

    expect(mocks.refundsCreate).not.toHaveBeenCalled();
    await expect(
      testPrisma.order.findUniqueOrThrow({ where: { id: pending.id } }),
    ).resolves.toMatchObject({ status: "PENDING", fulfillmentStatus: "UNFULFILLED" });
    await expect(
      testPrisma.payment.findUniqueOrThrow({ where: { orderId: pending.id } }),
    ).resolves.toMatchObject({ status: "PENDING" });
    await expect(
      testPrisma.orderAuditLog.count({ where: { orderId: pending.id } }),
    ).resolves.toBe(0);
  });

  it("refuses a PAID order with no payment intent without calling Stripe", { timeout: REFUND_TEST_TIMEOUT }, async () => {
    const admin = await createUser("ADMIN");
    const { order } = await createPaidOrder({ withIntent: false });

    await expect(refundPayment(order.id, admin.id)).rejects.toThrow(
      OrderNotRefundableError,
    );

    expect(mocks.refundsCreate).not.toHaveBeenCalled();
    await expect(
      testPrisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).resolves.toMatchObject({ status: "PAID" });
  });

  it("refuses a shipped PAID order without calling Stripe", { timeout: REFUND_TEST_TIMEOUT }, async () => {
    const admin = await createUser("ADMIN");
    const { order } = await createPaidOrder({ fulfillmentStatus: "SHIPPED" });

    await expect(refundPayment(order.id, admin.id)).rejects.toThrow(
      OrderNotRefundableError,
    );

    expect(mocks.refundsCreate).not.toHaveBeenCalled();
    await expect(
      testPrisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).resolves.toMatchObject({ status: "PAID", fulfillmentStatus: "SHIPPED" });
  });

  it("refunds a PAID order whose fulfillment was already cancelled (never shipped)", { timeout: REFUND_TEST_TIMEOUT }, async () => {
    const admin = await createUser("ADMIN");
    const { order, reservation, variant } = await createPaidOrder({
      fulfillmentStatus: "CANCELLED",
    });
    const payment = await testPrisma.payment.findUniqueOrThrow({
      where: { orderId: order.id },
    });

    const result = await refundPayment(order.id, admin.id);

    expect(result).toEqual({ refunded: true });
    expect(mocks.refundsCreate).toHaveBeenCalledTimes(1);
    expect(mocks.refundsCreate).toHaveBeenCalledWith(
      { payment_intent: payment.providerPaymentIntentId },
      { idempotencyKey: `refund-${order.id}` },
    );

    await expect(
      testPrisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).resolves.toMatchObject({ status: "CANCELLED", fulfillmentStatus: "CANCELLED" });
    await expect(
      testPrisma.payment.findUniqueOrThrow({ where: { orderId: order.id } }),
    ).resolves.toMatchObject({ status: "REFUNDED" });

    // The reversed sale restocks onHand and releases the hold.
    await expect(
      testPrisma.reservation.findUniqueOrThrow({
        where: { id: reservation!.id },
      }),
    ).resolves.toMatchObject({ status: "RELEASED" });
    await expect(
      testPrisma.productVariant.findUniqueOrThrow({
        where: { id: variant!.id },
      }),
    ).resolves.toMatchObject({ onHand: 10, reserved: 0 });

    const audits = await testPrisma.orderAuditLog.findMany({
      where: { orderId: order.id },
    });
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      actorId: admin.id,
      action: "ORDER_REFUNDED",
      fromStatus: "PAID",
      toStatus: "CANCELLED",
    });
  });

  it("returns the coupon use on a successful admin refund", { timeout: REFUND_TEST_TIMEOUT }, async () => {
    const admin = await createUser("ADMIN");
    const { order } = await createPaidOrder({ withReservation: false });
    const couponCode = nextToken("coupon").toUpperCase();
    await testPrisma.order.update({
      where: { id: order.id },
      data: { discountCents: 500, couponCode },
    });
    await testPrisma.coupon.create({
      data: { code: couponCode, amountOffCents: 500, usedCount: 1 },
    });

    await refundPayment(order.id, admin.id);

    expect(mocks.refundsCreate).toHaveBeenCalledTimes(1);
    // The snapshot survives the refund; only usage is returned.
    await expect(
      testPrisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).resolves.toMatchObject({
      status: "CANCELLED",
      discountCents: 500,
      couponCode,
    });
    await expect(
      testPrisma.coupon.findUniqueOrThrow({ where: { code: couponCode } }),
    ).resolves.toMatchObject({ usedCount: 0 });
  });

  it("throws OrderNotFoundError for a missing order without calling Stripe", { timeout: REFUND_TEST_TIMEOUT }, async () => {
    const admin = await createUser("ADMIN");

    await expect(
      refundPayment("missing-order", admin.id),
    ).rejects.toThrow(OrderNotFoundError);

    expect(mocks.refundsCreate).not.toHaveBeenCalled();
  });
});

describe("canRefund (shared service + page predicate)", () => {
  const succeededStripe = {
    status: "SUCCEEDED",
    provider: "stripe",
    providerPaymentIntentId: "pi_123",
  };

  it("allows PAID + UNFULFILLED/PROCESSING with a succeeded Stripe intent", () => {
    for (const fulfillmentStatus of ["UNFULFILLED", "PROCESSING"] as const) {
      expect(
        canRefund({ status: "PAID", fulfillmentStatus, payment: { ...succeededStripe } }),
      ).toBe(true);
    }
  });

  it("allows PAID + CANCELLED fulfillment (never shipped; stranded money)", () => {
    expect(
      canRefund({
        status: "PAID",
        fulfillmentStatus: "CANCELLED",
        payment: { ...succeededStripe },
      }),
    ).toBe(true);
  });

  it("refuses shipped or delivered PAID orders", () => {
    for (const fulfillmentStatus of ["SHIPPED", "DELIVERED"] as const) {
      expect(
        canRefund({ status: "PAID", fulfillmentStatus, payment: { ...succeededStripe } }),
      ).toBe(false);
    }
  });

  it("refuses non-PAID orders even with a succeeded payment", () => {
    for (const status of ["PENDING", "CANCELLED"] as const) {
      expect(
        canRefund({ status, fulfillmentStatus: "UNFULFILLED", payment: { ...succeededStripe } }),
      ).toBe(false);
    }
  });

  it("refuses non-succeeded, missing, intent-less, or non-Stripe payments", () => {
    const base = { status: "PAID", fulfillmentStatus: "UNFULFILLED" } as const;
    expect(canRefund({ ...base, payment: null })).toBe(false);
    expect(
      canRefund({ ...base, payment: { ...succeededStripe, status: "PENDING" } }),
    ).toBe(false);
    expect(
      canRefund({ ...base, payment: { ...succeededStripe, status: "CANCELLED" } }),
    ).toBe(false);
    expect(
      canRefund({ ...base, payment: { ...succeededStripe, status: "REFUNDED" } }),
    ).toBe(false);
    expect(
      canRefund({
        ...base,
        payment: { ...succeededStripe, providerPaymentIntentId: null },
      }),
    ).toBe(false);
    expect(
      canRefund({ ...base, payment: { ...succeededStripe, provider: "other" } }),
    ).toBe(false);
  });
});

describe("cancelled-order fulfillment guard", () => {
  it("refuses to ship a legacy expiry-cancelled order (CANCELLED + UNFULFILLED)", { timeout: REFUND_TEST_TIMEOUT }, async () => {
    const admin = await createUser("ADMIN");
    const customer = await createUser();
    const legacy = await testPrisma.order.create({
      data: {
        userId: customer.id,
        status: "CANCELLED",
        fulfillmentStatus: "UNFULFILLED",
        currency: "USD",
        subtotalCents: 3998,
        shippingCents: 500,
        taxCents: 320,
        totalCents: 4818,
        shippingFullName: SHIPPING.fullName,
        shippingLine1: SHIPPING.line1,
        shippingLine2: SHIPPING.line2,
        shippingCity: SHIPPING.city,
        shippingRegion: SHIPPING.region,
        shippingPostalCode: SHIPPING.postalCode,
        shippingCountry: SHIPPING.country,
        items: {
          create: [
            {
              variantId: null,
              productSlug: "product-slug",
              sku: "sku-1",
              title: "Snapshot product",
              unitPriceCents: 1999,
              quantity: 2,
              lineTotalCents: 3998,
            },
          ],
        },
      },
    });

    await expect(
      updateFulfillment(legacy.id, "PROCESSING", admin.id),
    ).rejects.toBeInstanceOf(InvalidFulfillmentTransitionError);

    await expect(
      testPrisma.order.findUniqueOrThrow({ where: { id: legacy.id } }),
    ).resolves.toMatchObject({
      status: "CANCELLED",
      fulfillmentStatus: "UNFULFILLED",
    });
    await expect(
      testPrisma.orderAuditLog.count({ where: { orderId: legacy.id } }),
    ).resolves.toBe(0);
  });

  it("refuses any transition on a fully cancelled order (CANCELLED + CANCELLED)", { timeout: REFUND_TEST_TIMEOUT }, async () => {
    const admin = await createUser("ADMIN");
    const { order } = await createPaidOrder();
    await refundPayment(order.id, admin.id);
    expect(mocks.refundsCreate).toHaveBeenCalledTimes(1);

    await expect(
      updateFulfillment(order.id, "PROCESSING", admin.id),
    ).rejects.toBeInstanceOf(InvalidFulfillmentTransitionError);

    // The failed transition wrote nothing beyond the single refund audit row.
    await expect(
      testPrisma.orderAuditLog.count({ where: { orderId: order.id } }),
    ).resolves.toBe(1);
  });
});
