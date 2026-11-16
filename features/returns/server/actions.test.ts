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

const {
  DuplicateReturnError,
  OrderNotFoundError,
  requestReturn,
  ReturnNotEligibleError,
} = await import("./actions");

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

interface DeliveredOrderOptions {
  userId?: string | null;
  guestToken?: string | null;
  status?: "PAID" | "PENDING" | "CANCELLED";
  fulfillmentStatus?:
    | "UNFULFILLED"
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED";
}

async function createOrderFixture(options: DeliveredOrderOptions = {}) {
  return testPrisma.order.create({
    data: {
      userId: options.userId ?? null,
      guestToken: options.guestToken ?? null,
      status: options.status ?? "PAID",
      fulfillmentStatus: options.fulfillmentStatus ?? "DELIVERED",
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
          status: "SUCCEEDED",
          provider: "stripe",
          providerPaymentIntentId: `pi-${nextToken("intent")}`,
          amountCents: 4818,
          currency: "USD",
        },
      },
    },
  });
}

/**
 * Backdates the order row so the return window can be tested. Prisma's
 * `@updatedAt` would otherwise stamp every write with the current time, so
 * this goes through raw SQL to simulate a delivery older than 30 days.
 */
async function backdateOrder(orderId: string, daysAgo: number): Promise<void> {
  const stamp = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  await testPrisma.$executeRaw`UPDATE "Order" SET "updatedAt" = ${stamp} WHERE "id" = ${orderId}`;
}

beforeEach(async () => {
  // Foreign-key order matters: children before parents.
  await testPrisma.returnRequest.deleteMany();
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

// DB-backed return tests each perform several sequential round trips to the
// disposable database, so they carry an explicit timeout instead of relying
// on the 5s default (a hang/deadlock would still exceed this quickly).
const RETURN_TEST_TIMEOUT = 30_000;

describe("requestReturn", () => {
  it("creates a PENDING request for a DELIVERED order within 30 days", { timeout: RETURN_TEST_TIMEOUT }, async () => {
    const user = await createUser();
    const order = await createOrderFixture({ userId: user.id });

    const request = await requestReturn(
      order.id,
      { userId: user.id },
      "  Arrived damaged  ",
    );

    expect(request).toMatchObject({
      orderId: order.id,
      status: "PENDING",
      reason: "Arrived damaged",
    });
    await expect(
      testPrisma.returnRequest.findUniqueOrThrow({
        where: { orderId: order.id },
      }),
    ).resolves.toMatchObject({ orderId: order.id, status: "PENDING" });

    const audits = await testPrisma.orderAuditLog.findMany({
      where: { orderId: order.id },
    });
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      actorId: user.id,
      action: "RETURN_REQUESTED",
    });
  });

  it("rejects a duplicate request for the same order and keeps a single row", { timeout: RETURN_TEST_TIMEOUT }, async () => {
    const user = await createUser();
    const order = await createOrderFixture({ userId: user.id });

    await requestReturn(order.id, { userId: user.id }, "Too small");

    await expect(
      requestReturn(order.id, { userId: user.id }, "Changed my mind"),
    ).rejects.toThrow(DuplicateReturnError);

    await expect(
      testPrisma.returnRequest.count({ where: { orderId: order.id } }),
    ).resolves.toBe(1);
  });

  it("rejects orders that are not DELIVERED and writes nothing", { timeout: RETURN_TEST_TIMEOUT }, async () => {
    const user = await createUser();
    const pending = await createOrderFixture({
      userId: user.id,
      status: "PENDING",
      fulfillmentStatus: "UNFULFILLED",
    });
    const shipped = await createOrderFixture({
      userId: user.id,
      fulfillmentStatus: "SHIPPED",
    });

    await expect(
      requestReturn(pending.id, { userId: user.id }, "Want a return"),
    ).rejects.toThrow(ReturnNotEligibleError);
    await expect(
      requestReturn(shipped.id, { userId: user.id }, "Want a return"),
    ).rejects.toThrow(ReturnNotEligibleError);

    await expect(testPrisma.returnRequest.count()).resolves.toBe(0);
    await expect(
      testPrisma.orderAuditLog.count({
        where: { orderId: { in: [pending.id, shipped.id] } },
      }),
    ).resolves.toBe(0);
  });

  it("rejects DELIVERED orders older than 30 days but allows recent ones", { timeout: RETURN_TEST_TIMEOUT }, async () => {
    const user = await createUser();
    const stale = await createOrderFixture({ userId: user.id });
    await backdateOrder(stale.id, 31);
    const recent = await createOrderFixture({ userId: user.id });
    await backdateOrder(recent.id, 29);

    await expect(
      requestReturn(stale.id, { userId: user.id }, "Late return"),
    ).rejects.toThrow(ReturnNotEligibleError);

    const request = await requestReturn(
      recent.id,
      { userId: user.id },
      "Still in window",
    );
    expect(request).toMatchObject({ orderId: recent.id, status: "PENDING" });
    await expect(
      testPrisma.returnRequest.count({ where: { orderId: stale.id } }),
    ).resolves.toBe(0);
  });

  it("lets a guest request with the right token and rejects wrong tokens", { timeout: RETURN_TEST_TIMEOUT }, async () => {
    const token = nextToken("guest-return");
    const order = await createOrderFixture({ guestToken: token });

    await expect(
      requestReturn(order.id, { guestToken: "wrong-token" }, "Broken"),
    ).rejects.toThrow(OrderNotFoundError);

    const request = await requestReturn(
      order.id,
      { guestToken: token },
      "Broken",
    );
    expect(request).toMatchObject({ orderId: order.id, status: "PENDING" });

    const audits = await testPrisma.orderAuditLog.findMany({
      where: { orderId: order.id },
    });
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ actorId: null });
  });

  it("rejects another user's order id and unknown ids without touching the owner's order", { timeout: RETURN_TEST_TIMEOUT }, async () => {
    const owner = await createUser();
    const intruder = await createUser();
    const order = await createOrderFixture({ userId: owner.id });

    await expect(
      requestReturn(order.id, { userId: intruder.id }, "Not mine"),
    ).rejects.toThrow(OrderNotFoundError);
    await expect(
      requestReturn("missing-order", { userId: owner.id }, "Nope"),
    ).rejects.toThrow(OrderNotFoundError);
    await expect(
      requestReturn(order.id, {}, "No credentials"),
    ).rejects.toThrow(OrderNotFoundError);

    await expect(testPrisma.returnRequest.count()).resolves.toBe(0);
  });

  it("requires a non-empty reason within 1000 characters", { timeout: RETURN_TEST_TIMEOUT }, async () => {
    const user = await createUser();
    const order = await createOrderFixture({ userId: user.id });

    await expect(
      requestReturn(order.id, { userId: user.id }, "   "),
    ).rejects.toThrow(ReturnNotEligibleError);
    await expect(
      requestReturn(order.id, { userId: user.id }, "x".repeat(1001)),
    ).rejects.toThrow(ReturnNotEligibleError);

    await expect(testPrisma.returnRequest.count()).resolves.toBe(0);
  });
});
