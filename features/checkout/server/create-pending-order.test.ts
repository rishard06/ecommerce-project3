import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
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

const { createPendingOrder, InsufficientStockError } = await import(
  "./create-pending-order"
);

const SHIPPING = {
  fullName: "Jane Doe",
  line1: "123 Main Street",
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

async function createUser() {
  const id = nextToken("user");
  return testPrisma.user.create({
    data: {
      id,
      name: "Test User",
      email: `${id}@example.com`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

interface VariantOptions {
  priceCents?: number;
  onHand?: number;
  reserved?: number;
}

async function createVariant(options: VariantOptions = {}) {
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
  const variant = await testPrisma.productVariant.create({
    data: {
      productId: product.id,
      sku: `sku-${token}`,
      name: "Default",
      priceCents: options.priceCents ?? 1999,
      onHand: options.onHand ?? 10,
      reserved: options.reserved ?? 0,
    },
  });

  return { category, product, variant };
}

async function expectNoOrderRows() {
  expect(await testPrisma.order.count()).toBe(0);
  expect(await testPrisma.orderItem.count()).toBe(0);
  expect(await testPrisma.payment.count()).toBe(0);
  expect(await testPrisma.reservation.count()).toBe(0);
}

beforeEach(async () => {
  // Foreign-key order matters: children before parents.
  await testPrisma.orderAuditLog.deleteMany();
  await testPrisma.reservation.deleteMany();
  await testPrisma.payment.deleteMany();
  await testPrisma.orderItem.deleteMany();
  await testPrisma.order.deleteMany();
  await testPrisma.webhookEvent.deleteMany();
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

describe("createPendingOrder validation", () => {
  it("rejects an empty cart without creating any rows", async () => {
    const user = await createUser();

    await expect(
      createPendingOrder({
        userId: user.id,
        items: [],
        shipping: SHIPPING,
        idempotencyKey: "key-empty-cart",
      }),
    ).rejects.toThrow();

    await expectNoOrderRows();
  });

  it("rejects a missing user id without creating any rows", async () => {
    const { variant } = await createVariant();

    await expect(
      createPendingOrder({
        userId: "",
        items: [{ variantId: variant.id, quantity: 1 }],
        shipping: SHIPPING,
        idempotencyKey: "key-missing-user",
      }),
    ).rejects.toThrow(/user id/i);

    await expectNoOrderRows();
    expect(
      (await testPrisma.productVariant.findUniqueOrThrow({
        where: { id: variant.id },
      })).reserved,
    ).toBe(0);
  });

  it("rejects an empty idempotency key without creating any rows", async () => {
    const user = await createUser();
    const { variant } = await createVariant();

    await expect(
      createPendingOrder({
        userId: user.id,
        items: [{ variantId: variant.id, quantity: 1 }],
        shipping: SHIPPING,
        idempotencyKey: "",
      }),
    ).rejects.toThrow(/idempotency key/i);

    await expectNoOrderRows();
  });

  it("rejects invalid shipping before touching stock", async () => {
    const user = await createUser();
    const { variant } = await createVariant();

    await expect(
      createPendingOrder({
        userId: user.id,
        items: [{ variantId: variant.id, quantity: 1 }],
        shipping: { ...SHIPPING, city: "" },
        idempotencyKey: "key-invalid-shipping",
      }),
    ).rejects.toThrow(/city/i);

    await expectNoOrderRows();
    expect(
      (await testPrisma.productVariant.findUniqueOrThrow({
        where: { id: variant.id },
      })).reserved,
    ).toBe(0);
  });
});

describe("createPendingOrder atomic reservations", () => {
  it("rolls back every reserved line when one line has insufficient stock", async () => {
    const user = await createUser();
    const available = await createVariant({ onHand: 5 });
    const scarce = await createVariant({ onHand: 1 });

    const error = await createPendingOrder({
      userId: user.id,
      items: [
        { variantId: available.variant.id, quantity: 2 },
        { variantId: scarce.variant.id, quantity: 2 },
      ],
      shipping: SHIPPING,
      idempotencyKey: "key-rollback",
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(InsufficientStockError);
    expect((error as Error).message).toContain(scarce.variant.id);

    await expectNoOrderRows();
    expect(
      (await testPrisma.productVariant.findUniqueOrThrow({
        where: { id: available.variant.id },
      })).reserved,
    ).toBe(0);
    expect(
      (await testPrisma.productVariant.findUniqueOrThrow({
        where: { id: scarce.variant.id },
      })).reserved,
    ).toBe(0);
  });

  it("allows exactly one of two concurrent requests to take the last unit", async () => {
    const firstUser = await createUser();
    const secondUser = await createUser();
    const { variant } = await createVariant({ onHand: 1 });

    const results = await Promise.allSettled([
      createPendingOrder({
        userId: firstUser.id,
        items: [{ variantId: variant.id, quantity: 1 }],
        shipping: SHIPPING,
        idempotencyKey: "key-race-a",
      }),
      createPendingOrder({
        userId: secondUser.id,
        items: [{ variantId: variant.id, quantity: 1 }],
        shipping: SHIPPING,
        idempotencyKey: "key-race-b",
      }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      InsufficientStockError,
    );

    expect(await testPrisma.order.count()).toBe(1);
    expect(await testPrisma.reservation.count()).toBe(1);
    expect(
      (await testPrisma.productVariant.findUniqueOrThrow({
        where: { id: variant.id },
      })).reserved,
    ).toBe(1);
  });

  it("returns the original order for a repeated user-scoped idempotency key, even with no stock left", async () => {
    const user = await createUser();
    const { variant } = await createVariant({ onHand: 2, priceCents: 1999 });

    const input = {
      userId: user.id,
      items: [{ variantId: variant.id, quantity: 2 }],
      shipping: SHIPPING,
      idempotencyKey: "key-idempotent",
    };

    const first = await createPendingOrder(input);

    // Stock is now exhausted; an idempotent retry must still return the order.
    await testPrisma.productVariant.update({
      where: { id: variant.id },
      data: { onHand: 0 },
    });

    const second = await createPendingOrder(input);
    const third = await createPendingOrder(input);

    expect(second.orderId).toBe(first.orderId);
    expect(third.orderId).toBe(first.orderId);
    expect(await testPrisma.order.count()).toBe(1);
    expect(await testPrisma.reservation.count()).toBe(1);
    expect(
      (await testPrisma.productVariant.findUniqueOrThrow({
        where: { id: variant.id },
      })).reserved,
    ).toBe(2);
  });
});

describe("createPendingOrder snapshots", () => {
  it("snapshots authoritative totals, line items, payment, and reservations", async () => {
    const user = await createUser();
    const first = await createVariant({ onHand: 5, priceCents: 1999 });
    const second = await createVariant({ onHand: 5, priceCents: 500 });

    const result = await createPendingOrder({
      userId: user.id,
      items: [
        // Browser-supplied prices must always be ignored.
        {
          variantId: first.variant.id,
          quantity: 2,
          priceCents: 1,
          unitPriceCents: 1,
        },
        { variantId: second.variant.id, quantity: 1 },
      ] as never,
      shipping: { ...SHIPPING, line2: "Apt 4" },
      idempotencyKey: "key-snapshot",
    });

    const order = await testPrisma.order.findUniqueOrThrow({
      where: { id: result.orderId },
      include: { items: true, payment: true, reservations: true },
    });

    expect(order).toMatchObject({
      userId: user.id,
      status: "PENDING",
      fulfillmentStatus: "UNFULFILLED",
      currency: "USD",
      subtotalCents: 4498,
      shippingCents: 0,
      taxCents: 67,
      totalCents: 4565,
      idempotencyKey: "key-snapshot",
      shippingFullName: "Jane Doe",
      shippingLine1: "123 Main Street",
      shippingLine2: "Apt 4",
      shippingCity: "Springfield",
      shippingRegion: "IL",
      shippingPostalCode: "62701",
      shippingCountry: "US",
    });

    expect(order.items).toHaveLength(2);
    expect(
      order.items.find((item) => item.variantId === first.variant.id),
    ).toMatchObject({
      productSlug: first.product.slug,
      sku: first.variant.sku,
      title: first.product.title,
      unitPriceCents: 1999,
      quantity: 2,
      lineTotalCents: 3998,
    });
    expect(
      order.items.find((item) => item.variantId === second.variant.id),
    ).toMatchObject({
      productSlug: second.product.slug,
      sku: second.variant.sku,
      title: second.product.title,
      unitPriceCents: 500,
      quantity: 1,
      lineTotalCents: 500,
    });

    expect(order.payment).toMatchObject({
      status: "PENDING",
      provider: "stripe",
      amountCents: 4565,
      currency: "USD",
    });

    expect(order.reservations).toHaveLength(2);
    const expiresAt = order.reservations[0].expiresAt.getTime();
    expect(expiresAt).toBeGreaterThan(Date.now() + 29 * 60 * 1000);
    expect(expiresAt).toBeLessThan(Date.now() + 31 * 60 * 1000);
    for (const reservation of order.reservations) {
      expect(reservation.status).toBe("ACTIVE");
      expect(reservation.orderId).toBe(order.id);
    }
  });
});
