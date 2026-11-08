import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { PrismaClient } from "@/app/generated/prisma";

/**
 * Loads the disposable test database URL. Tests must never fall back to the
 * application database: if `DATABASE_URL_TEST` is missing or points at the
 * same value as `DATABASE_URL`, the suite fails before any query.
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

const CRON_SECRET = "cron_test_secret_for_release_route";

// `getServerEnv()` validates the whole server environment. Provide inert test
// values for anything the local `.env` does not define so the route tests do
// not depend on developer-specific configuration.
process.env.BETTER_AUTH_SECRET ??= "test-better-auth-secret";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.GITHUB_CLIENT_ID ??= "test-github-client-id";
process.env.GITHUB_CLIENT_SECRET ??= "test-github-client-secret";
process.env.STRIPE_SECRET_KEY ??= "sk_test_release_route_only";
process.env.STRIPE_WEBHOOK_SECRET ??= "whsec_test_release_route_only";

// The cron route reads the secret through `getServerEnv()`; set it before the
// route module is imported so the import-time environment matches runtime.
process.env.CRON_SECRET = CRON_SECRET;

// Test files share one disposable database, so serialize them with the same
// PostgreSQL advisory lock used by the other database suites. A single pooled
// connection guarantees the session holding the lock stays alive until
// `afterAll`.
const testPrisma = new PrismaClient({
  datasourceUrl: `${testDatabaseUrl}${testDatabaseUrl.includes("?") ? "&" : "?"}connection_limit=1`,
});

const TEST_DATABASE_LOCK_KEY = 728674001;

const { releaseExpiredReservations } = await import(
  "./release-expired-reservations"
);
const cronRoute = await import("@/app/api/cron/release-reservations/route");

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

  return variant;
}

type ReservationStatus = "ACTIVE" | "COMMITTED" | "RELEASED";
type OrderStatus = "PENDING" | "PAID" | "CANCELLED";
type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED";

interface ReservationInput {
  variant: Awaited<ReturnType<typeof createVariant>>;
  expiresAt: Date;
  quantity?: number;
  status?: ReservationStatus;
}

interface OrderFixtureOptions {
  reservations: ReservationInput[];
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
}

async function createOrderFixture(options: OrderFixtureOptions) {
  const user = await createUser();
  const token = nextToken("order");
  const totalCents = options.reservations.reduce(
    (sum, line) =>
      sum + line.variant.priceCents * (line.quantity ?? 1),
    0,
  );

  const order = await testPrisma.order.create({
    data: {
      userId: user.id,
      status: options.status ?? "PENDING",
      fulfillmentStatus: "UNFULFILLED",
      currency: "USD",
      subtotalCents: totalCents,
      shippingCents: 0,
      taxCents: 0,
      totalCents,
      idempotencyKey: `key-${token}`,
      shippingFullName: "Jane Doe",
      shippingLine1: "123 Main Street",
      shippingCity: "Springfield",
      shippingRegion: "IL",
      shippingPostalCode: "62701",
      shippingCountry: "US",
      items: {
        create: options.reservations.map((line) => ({
          variantId: line.variant.id,
          productSlug: `product-${token}`,
          sku: line.variant.sku,
          title: `Product ${token}`,
          unitPriceCents: line.variant.priceCents,
          quantity: line.quantity ?? 1,
          lineTotalCents: line.variant.priceCents * (line.quantity ?? 1),
        })),
      },
      payment: {
        create: {
          status: options.paymentStatus ?? "PENDING",
          amountCents: totalCents,
          currency: "USD",
        },
      },
      reservations: {
        create: options.reservations.map((line) => ({
          variantId: line.variant.id,
          quantity: line.quantity ?? 1,
          status: line.status ?? "ACTIVE",
          expiresAt: line.expiresAt,
        })),
      },
    },
    include: { reservations: true },
  });

  return { order, totalCents };
}

async function loadState(orderId: string) {
  return {
    order: await testPrisma.order.findUniqueOrThrow({ where: { id: orderId } }),
    payment: await testPrisma.payment.findUniqueOrThrow({
      where: { orderId },
    }),
    reservations: await testPrisma.reservation.findMany({
      where: { orderId },
      orderBy: { variantId: "asc" },
    }),
  };
}

function secondsFromNow(seconds: number): Date {
  return new Date(Date.now() + seconds * 1000);
}

function cronRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3000/api/cron/release-reservations", {
    method: "GET",
    headers,
  });
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

afterEach(() => {
  vi.restoreAllMocks();
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

describe("releaseExpiredReservations eligibility", () => {
  it("leaves an unexpired active reservation unchanged", async () => {
    const now = new Date();
    const variant = await createVariant({ onHand: 5, reserved: 2 });
    const { order } = await createOrderFixture({
      reservations: [
        {
          variant,
          quantity: 2,
          expiresAt: new Date(now.getTime() + 60_000),
        },
      ],
    });

    await expect(releaseExpiredReservations(now)).resolves.toEqual({
      released: 0,
    });

    const state = await loadState(order.id);
    expect(state.reservations[0].status).toBe("ACTIVE");
    expect(state.order.status).toBe("PENDING");
    expect(state.payment.status).toBe("PENDING");

    const freshVariant = await testPrisma.productVariant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    expect(freshVariant.onHand).toBe(5);
    expect(freshVariant.reserved).toBe(2);
  });

  it("releases an expired active reservation exactly once", async () => {
    const now = new Date();
    const variant = await createVariant({ onHand: 5, reserved: 3 });
    const { order } = await createOrderFixture({
      reservations: [
        {
          variant,
          quantity: 3,
          expiresAt: new Date(now.getTime() - 1_000),
        },
      ],
    });

    await expect(releaseExpiredReservations(now)).resolves.toEqual({
      released: 1,
    });

    const state = await loadState(order.id);
    expect(state.reservations[0].status).toBe("RELEASED");
    expect(state.order.status).toBe("CANCELLED");
    expect(state.payment.status).toBe("CANCELLED");

    const freshVariant = await testPrisma.productVariant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    expect(freshVariant.onHand).toBe(5);
    expect(freshVariant.reserved).toBe(0);

    // A retry must not release (or count) the same hold again.
    await expect(releaseExpiredReservations(now)).resolves.toEqual({
      released: 0,
    });

    const afterRetry = await loadState(order.id);
    expect(afterRetry.reservations[0].status).toBe("RELEASED");
    expect(afterRetry.order.status).toBe("CANCELLED");
    expect(afterRetry.payment.status).toBe("CANCELLED");
    const variantAfterRetry =
      await testPrisma.productVariant.findUniqueOrThrow({
        where: { id: variant.id },
      });
    expect(variantAfterRetry.onHand).toBe(5);
    expect(variantAfterRetry.reserved).toBe(0);
  });

  it("never releases a committed reservation even with a past expiry", async () => {
    const now = new Date();
    const variant = await createVariant({ onHand: 5, reserved: 0 });
    const { order } = await createOrderFixture({
      reservations: [
        {
          variant,
          quantity: 2,
          status: "COMMITTED",
          expiresAt: new Date(now.getTime() - 60_000),
        },
      ],
    });

    await expect(releaseExpiredReservations(now)).resolves.toEqual({
      released: 0,
    });

    const state = await loadState(order.id);
    expect(state.reservations[0].status).toBe("COMMITTED");
    expect(state.order.status).toBe("PENDING");
    expect(state.payment.status).toBe("PENDING");

    const freshVariant = await testPrisma.productVariant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    expect(freshVariant.onHand).toBe(5);
    expect(freshVariant.reserved).toBe(0);
  });

  it("skips a paid order's reservations and logs a warning", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const now = new Date();
    const variant = await createVariant({ onHand: 1, reserved: 1 });
    const { order } = await createOrderFixture({
      status: "PAID",
      paymentStatus: "SUCCEEDED",
      reservations: [
        {
          variant,
          quantity: 1,
          expiresAt: new Date(now.getTime() - 60_000),
        },
      ],
    });

    await expect(releaseExpiredReservations(now)).resolves.toEqual({
      released: 0,
    });

    const state = await loadState(order.id);
    expect(state.reservations[0].status).toBe("ACTIVE");
    expect(state.order.status).toBe("PAID");
    expect(state.payment.status).toBe("SUCCEEDED");

    const freshVariant = await testPrisma.productVariant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    expect(freshVariant.onHand).toBe(1);
    expect(freshVariant.reserved).toBe(1);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain(order.id);
  });

  it("rolls back the claim when reserved stock is inconsistent", async () => {
    const now = new Date();
    const variant = await createVariant({ onHand: 5, reserved: 0 });
    const { order } = await createOrderFixture({
      reservations: [
        {
          variant,
          quantity: 2,
          expiresAt: new Date(now.getTime() - 1_000),
        },
      ],
    });

    await expect(releaseExpiredReservations(now)).rejects.toThrow();

    const state = await loadState(order.id);
    expect(state.reservations[0].status).toBe("ACTIVE");
    expect(state.order.status).toBe("PENDING");
    expect(state.payment.status).toBe("PENDING");

    const freshVariant = await testPrisma.productVariant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    expect(freshVariant.onHand).toBe(5);
    expect(freshVariant.reserved).toBe(0);
  });
});

describe("releaseExpiredReservations concurrency", () => {
  it("releases each reservation exactly once across concurrent runs", async () => {
    const now = new Date();
    const variantA = await createVariant({ onHand: 20, reserved: 8 });
    const variantB = await createVariant({ onHand: 10, reserved: 1 });
    const expiredAt = new Date(now.getTime() - 60_000);

    const orders = [];

    // One order with two reservations plus six single-reservation orders.
    orders.push(
      await createOrderFixture({
        reservations: [
          { variant: variantA, quantity: 2, expiresAt: expiredAt },
          { variant: variantB, quantity: 1, expiresAt: expiredAt },
        ],
      }),
    );
    for (let index = 0; index < 6; index += 1) {
      orders.push(
        await createOrderFixture({
          reservations: [
            { variant: variantA, quantity: 1, expiresAt: expiredAt },
          ],
        }),
      );
    }

    const results = await Promise.all([
      releaseExpiredReservations(now),
      releaseExpiredReservations(now),
    ]);

    const totalReleased = results.reduce(
      (total, result) => total + result.released,
      0,
    );
    expect(totalReleased).toBe(8);
    for (const result of results) {
      expect(result.released).toBeGreaterThanOrEqual(0);
    }

    expect(
      await testPrisma.reservation.count({ where: { status: "RELEASED" } }),
    ).toBe(8);
    expect(
      await testPrisma.reservation.count({ where: { status: "ACTIVE" } }),
    ).toBe(0);

    const freshA = await testPrisma.productVariant.findUniqueOrThrow({
      where: { id: variantA.id },
    });
    const freshB = await testPrisma.productVariant.findUniqueOrThrow({
      where: { id: variantB.id },
    });
    expect(freshA.onHand).toBe(20);
    expect(freshA.reserved).toBe(0);
    expect(freshB.onHand).toBe(10);
    expect(freshB.reserved).toBe(0);

    for (const { order } of orders) {
      const state = await loadState(order.id);
      expect(state.order.status).toBe("CANCELLED");
      expect(state.payment.status).toBe("CANCELLED");
    }

    await expect(releaseExpiredReservations(now)).resolves.toEqual({
      released: 0,
    });
  });
});

describe("GET /api/cron/release-reservations", () => {
  it("runs on the node runtime without static caching", () => {
    expect(cronRoute.runtime).toBe("nodejs");
    expect(cronRoute.dynamic).toBe("force-dynamic");
    expect(cronRoute.GET).toBeTypeOf("function");
  });

  it("rejects a request without an authorization header without touching data", async () => {
    const variant = await createVariant({ onHand: 5, reserved: 2 });
    const { order } = await createOrderFixture({
      reservations: [
        { variant, quantity: 2, expiresAt: secondsFromNow(-60) },
      ],
    });

    const response = await cronRoute.GET(cronRequest());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });

    const state = await loadState(order.id);
    expect(state.reservations[0].status).toBe("ACTIVE");
    expect(state.order.status).toBe("PENDING");
    expect(state.payment.status).toBe("PENDING");
    const freshVariant = await testPrisma.productVariant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    expect(freshVariant.reserved).toBe(2);
  });

  it("rejects a wrong bearer secret without touching data", async () => {
    const variant = await createVariant({ onHand: 5, reserved: 2 });
    const { order } = await createOrderFixture({
      reservations: [
        { variant, quantity: 2, expiresAt: secondsFromNow(-60) },
      ],
    });

    const response = await cronRoute.GET(
      cronRequest({ authorization: "Bearer not-the-cron-secret" }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });

    const state = await loadState(order.id);
    expect(state.reservations[0].status).toBe("ACTIVE");
    expect(state.order.status).toBe("PENDING");
    const freshVariant = await testPrisma.productVariant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    expect(freshVariant.reserved).toBe(2);
  });

  it("returns 500 when CRON_SECRET is not configured", async () => {
    const variant = await createVariant({ onHand: 5, reserved: 2 });
    const { order } = await createOrderFixture({
      reservations: [
        { variant, quantity: 2, expiresAt: secondsFromNow(-60) },
      ],
    });

    const savedSecret = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;

    try {
      const response = await cronRoute.GET(
        cronRequest({ authorization: `Bearer ${CRON_SECRET}` }),
      );

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Cleanup failed",
      });
    } finally {
      process.env.CRON_SECRET = savedSecret;
    }

    const state = await loadState(order.id);
    expect(state.reservations[0].status).toBe("ACTIVE");
    expect(state.order.status).toBe("PENDING");
  });

  it("releases expired reservations with a valid bearer secret", async () => {
    const variant = await createVariant({ onHand: 5, reserved: 2 });
    const { order } = await createOrderFixture({
      reservations: [
        { variant, quantity: 2, expiresAt: secondsFromNow(-60) },
      ],
    });

    const response = await cronRoute.GET(
      cronRequest({ authorization: `Bearer ${CRON_SECRET}` }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ released: 1 });

    const state = await loadState(order.id);
    expect(state.reservations[0].status).toBe("RELEASED");
    expect(state.order.status).toBe("CANCELLED");
    expect(state.payment.status).toBe("CANCELLED");
    const freshVariant = await testPrisma.productVariant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    expect(freshVariant.onHand).toBe(5);
    expect(freshVariant.reserved).toBe(0);
  });
});
