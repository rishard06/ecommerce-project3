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

const { getOrderForUser, listOrdersForUser } = await import(
  "./customer-order-service"
);

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

interface OrderFixtureOptions {
  createdAt?: Date;
  status?: "PENDING" | "PAID" | "CANCELLED";
  paymentStatus?: "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  fulfillmentStatus?:
    | "UNFULFILLED"
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED";
  withReservation?: boolean;
}

async function createOrder(userId: string, options: OrderFixtureOptions = {}) {
  const variant = options.withReservation ? await createVariant() : null;

  const order = await testPrisma.order.create({
    data: {
      userId,
      createdAt: options.createdAt ?? new Date(),
      status: options.status ?? "PENDING",
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
          status: options.paymentStatus ?? "PENDING",
          provider: "stripe",
          amountCents: 4818,
          currency: "USD",
        },
      },
    },
  });

  if (variant) {
    await testPrisma.reservation.create({
      data: {
        orderId: order.id,
        variantId: variant.id,
        quantity: 2,
        status: "ACTIVE",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
  }

  return order;
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

describe("getOrderForUser ownership", () => {
  it("returns null for another user's order id, never the other customer's data", async () => {
    const owner = await createUser();
    const intruder = await createUser();
    const order = await createOrder(owner.id);

    await expect(getOrderForUser(order.id, intruder.id)).resolves.toBeNull();
    await expect(getOrderForUser("missing-order", owner.id)).resolves.toBeNull();

    // The owner still sees their own order, so the null is ownership scoping
    // rather than a broken query.
    await expect(getOrderForUser(order.id, owner.id)).resolves.toMatchObject({
      id: order.id,
    });
  });
});

describe("listOrdersForUser", () => {
  it("returns only the authenticated user's orders, newest first", async () => {
    const user = await createUser();
    const otherUser = await createUser();

    const older = await createOrder(user.id, {
      createdAt: new Date("2026-01-01T10:00:00.000Z"),
    });
    const newer = await createOrder(user.id, {
      createdAt: new Date("2026-02-01T10:00:00.000Z"),
    });
    await createOrder(otherUser.id, {
      createdAt: new Date("2026-03-01T10:00:00.000Z"),
    });

    const orders = await listOrdersForUser(user.id);

    expect(orders.map((order) => order.id)).toEqual([newer.id, older.id]);
    expect(orders).toHaveLength(2);
    expect(orders[0]).toMatchObject({
      status: "PENDING",
      fulfillmentStatus: "UNFULFILLED",
      currency: "USD",
      subtotalCents: 3998,
      shippingCents: 500,
      taxCents: 320,
      totalCents: 4818,
    });
    expect(orders[0].createdAt).toEqual(newer.createdAt);
  });

  it("returns an empty list for a user with no orders", async () => {
    const user = await createUser();
    await createOrder((await createUser()).id);

    await expect(listOrdersForUser(user.id)).resolves.toEqual([]);
  });
});

describe("getOrderForUser detail", () => {
  it("includes line snapshots, the shipping snapshot, and payment separately", async () => {
    const user = await createUser();
    const order = await createOrder(user.id, {
      status: "PAID",
      paymentStatus: "SUCCEEDED",
      fulfillmentStatus: "PROCESSING",
    });

    const detail = await getOrderForUser(order.id, user.id);

    expect(detail).toMatchObject({
      id: order.id,
      status: "PAID",
      fulfillmentStatus: "PROCESSING",
      currency: "USD",
      subtotalCents: 3998,
      shippingCents: 500,
      taxCents: 320,
      totalCents: 4818,
      shipping: SHIPPING,
      payment: {
        status: "SUCCEEDED",
        provider: "stripe",
        amountCents: 4818,
        currency: "USD",
      },
    });
    expect(detail?.items).toHaveLength(1);
    expect(detail?.items[0]).toMatchObject({
      productSlug: "product-slug",
      sku: "sku-1",
      title: "Snapshot product",
      unitPriceCents: 1999,
      quantity: 2,
      lineTotalCents: 3998,
    });
  });
});

describe("success return is read-only", () => {
  it("does not change order, payment, or reservation rows when reading return data", async () => {
    const user = await createUser();
    const order = await createOrder(user.id, {
      status: "PENDING",
      paymentStatus: "PENDING",
      withReservation: true,
    });

    const snapshot = async () => ({
      order: await testPrisma.order.findUniqueOrThrow({
        where: { id: order.id },
        include: { items: { orderBy: { id: "asc" } } },
      }),
      payment: await testPrisma.payment.findUniqueOrThrow({
        where: { orderId: order.id },
      }),
      reservations: await testPrisma.reservation.findMany({
        where: { orderId: order.id },
        orderBy: { id: "asc" },
      }),
    });

    const before = await snapshot();

    const detail = await getOrderForUser(order.id, user.id);

    // The return page may only observe PostgreSQL state; it must never
    // synthesize a paid status before the signed webhook arrives.
    expect(detail?.status).toBe("PENDING");
    expect(detail?.payment?.status).toBe("PENDING");
    await expect(snapshot()).resolves.toEqual(before);
  });
});
