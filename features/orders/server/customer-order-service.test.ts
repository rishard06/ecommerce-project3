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
  cancelOrder,
  getOrderForUser,
  getOrderForViewer,
  listOrdersForUser,
  OrderNotCancellableError,
  OrderNotFoundError,
} = await import("./customer-order-service");

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
  discountCents?: number;
  couponCode?: string | null;
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
      discountCents: options.discountCents ?? 0,
      couponCode: options.couponCode ?? null,
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

async function createGuestOrder(guestToken: string) {
  return testPrisma.order.create({
    data: {
      userId: null,
      guestToken,
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
}

beforeEach(async () => {
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

describe("discount snapshot mapping", () => {
  it("lists orders with the coupon snapshot so totals reconcile", async () => {
    const user = await createUser();
    const discounted = await createOrder(user.id, {
      discountCents: 500,
      couponCode: "SAVE10",
    });
    const full = await createOrder(user.id);

    const orders = await listOrdersForUser(user.id);

    expect(orders).toHaveLength(2);
    const discountedRow = orders.find((order) => order.id === discounted.id);
    const fullRow = orders.find((order) => order.id === full.id);
    expect(discountedRow).toMatchObject({
      discountCents: 500,
      couponCode: "SAVE10",
    });
    expect(fullRow).toMatchObject({ discountCents: 0, couponCode: null });
  });

  it("returns the coupon snapshot on the order detail", async () => {
    const user = await createUser();
    const order = await createOrder(user.id, {
      discountCents: 500,
      couponCode: "SAVE10",
    });
    const plain = await createOrder(user.id);

    await expect(getOrderForUser(order.id, user.id)).resolves.toMatchObject({
      id: order.id,
      discountCents: 500,
      couponCode: "SAVE10",
    });
    await expect(getOrderForUser(plain.id, user.id)).resolves.toMatchObject({
      id: plain.id,
      discountCents: 0,
      couponCode: null,
    });
  });

  it("returns the coupon snapshot for a guest viewer", async () => {
    const token = nextToken("guest-viewer");
    const guest = await createGuestOrder(token);
    await testPrisma.order.update({
      where: { id: guest.id },
      data: { discountCents: 250, couponCode: "GUEST5" },
    });

    await expect(
      getOrderForViewer(guest.id, { guestToken: token }),
    ).resolves.toMatchObject({
      id: guest.id,
      discountCents: 250,
      couponCode: "GUEST5",
    });
  });
});

describe("getOrderForViewer guest access", () => {
  it("lets a guest token read its own order", async () => {
    const token = nextToken("guest-viewer");
    const order = await createGuestOrder(token);

    await expect(
      getOrderForViewer(order.id, { guestToken: token }),
    ).resolves.toMatchObject({ id: order.id });
  });

  it("returns null for a wrong token or another order's token", async () => {
    const token = nextToken("guest-viewer");
    const otherToken = nextToken("guest-viewer");
    const order = await createGuestOrder(token);
    const otherOrder = await createGuestOrder(otherToken);

    await expect(
      getOrderForViewer(order.id, { guestToken: "wrong-token" }),
    ).resolves.toBeNull();
    await expect(
      getOrderForViewer(order.id, { guestToken: otherToken }),
    ).resolves.toBeNull();
    await expect(
      getOrderForViewer(otherOrder.id, { guestToken: token }),
    ).resolves.toBeNull();
  });

  it("keeps the user path unchanged: owner reads own, intruder gets null", async () => {
    const owner = await createUser();
    const intruder = await createUser();
    const order = await createOrder(owner.id);

    await expect(
      getOrderForViewer(order.id, { userId: owner.id }),
    ).resolves.toMatchObject({ id: order.id });
    await expect(
      getOrderForViewer(order.id, { userId: intruder.id }),
    ).resolves.toBeNull();
  });

  it("does not leak a guest order to a userId alone, and returns null with no credentials", async () => {
    const token = nextToken("guest-viewer");
    const order = await createGuestOrder(token);
    const user = await createUser();

    await expect(
      getOrderForViewer(order.id, { userId: user.id }),
    ).resolves.toBeNull();
    await expect(getOrderForViewer(order.id, {})).resolves.toBeNull();
    await expect(
      getOrderForViewer(order.id, { userId: null, guestToken: null }),
    ).resolves.toBeNull();
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

describe("cancelOrder", () => {
  /**
   * Real checkouts increment `ProductVariant.reserved` when the hold is
   * created; the shared fixture only inserts the reservation row, so mirror
   * production stock state before cancelling.
   */
  async function createCancellableOrder(userId: string) {
    const order = await createOrder(userId, { withReservation: true });
    const reservation = await testPrisma.reservation.findFirstOrThrow({
      where: { orderId: order.id },
    });
    await testPrisma.productVariant.update({
      where: { id: reservation.variantId },
      data: { reserved: { increment: reservation.quantity } },
    });
    return { order, reservation };
  }

  // DB-backed cancellation tests each perform 10+ sequential round trips to the
  // disposable database, so they carry an explicit timeout instead of relying
  // on the 5s default (a hang/deadlock would still exceed this quickly).
  const CANCEL_TEST_TIMEOUT = 30_000;

  it("cancels a pending unfulfilled order: CANCELLED status, RELEASED holds, stock restored, payment cancelled, audit written", { timeout: CANCEL_TEST_TIMEOUT }, async () => {
    const user = await createUser();
    const { order, reservation } = await createCancellableOrder(user.id);
    const couponCode = nextToken("coupon").toUpperCase();
    await testPrisma.order.update({
      where: { id: order.id },
      data: { discountCents: 500, couponCode },
    });
    await testPrisma.coupon.create({
      data: { code: couponCode, amountOffCents: 500, usedCount: 1 },
    });

    await cancelOrder(order.id, { userId: user.id });

    const updated = await testPrisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(updated.status).toBe("CANCELLED");
    expect(updated.fulfillmentStatus).toBe("CANCELLED");
    // The coupon snapshot survives cancellation; usage is never returned here.
    expect(updated.discountCents).toBe(500);
    expect(updated.couponCode).toBe(couponCode);
    await expect(
      testPrisma.coupon.findUniqueOrThrow({ where: { code: couponCode } }),
    ).resolves.toMatchObject({ usedCount: 1 });

    await expect(
      testPrisma.reservation.findUniqueOrThrow({
        where: { id: reservation.id },
      }),
    ).resolves.toMatchObject({ status: "RELEASED" });
    await expect(
      testPrisma.productVariant.findUniqueOrThrow({
        where: { id: reservation.variantId },
      }),
    ).resolves.toMatchObject({ reserved: 0 });
    await expect(
      testPrisma.payment.findUniqueOrThrow({ where: { orderId: order.id } }),
    ).resolves.toMatchObject({ status: "CANCELLED" });

    const audits = await testPrisma.orderAuditLog.findMany({
      where: { orderId: order.id },
    });
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      actorId: user.id,
      action: "ORDER_CANCELLED",
      fromStatus: "PENDING",
      toStatus: "CANCELLED",
    });
  });

  it("rejects cancelling a PAID order and leaves every row untouched", { timeout: CANCEL_TEST_TIMEOUT }, async () => {
    const user = await createUser();
    const order = await createOrder(user.id, {
      status: "PAID",
      paymentStatus: "SUCCEEDED",
      fulfillmentStatus: "PROCESSING",
    });

    await expect(cancelOrder(order.id, { userId: user.id })).rejects.toThrow(
      OrderNotCancellableError,
    );

    await expect(
      testPrisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).resolves.toMatchObject({ status: "PAID" });
    await expect(
      testPrisma.payment.findUniqueOrThrow({ where: { orderId: order.id } }),
    ).resolves.toMatchObject({ status: "SUCCEEDED" });
    await expect(
      testPrisma.orderAuditLog.count({ where: { orderId: order.id } }),
    ).resolves.toBe(0);
  });

  it("rejects cancelling a PENDING order whose hold was already committed (webhook won the race)", { timeout: CANCEL_TEST_TIMEOUT }, async () => {
    const user = await createUser();
    const { order, reservation } = await createCancellableOrder(user.id);
    await testPrisma.reservation.update({
      where: { id: reservation.id },
      data: { status: "COMMITTED" },
    });

    await expect(cancelOrder(order.id, { userId: user.id })).rejects.toThrow(
      OrderNotCancellableError,
    );

    await expect(
      testPrisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).resolves.toMatchObject({
      status: "PENDING",
      fulfillmentStatus: "UNFULFILLED",
    });
    await expect(
      testPrisma.payment.findUniqueOrThrow({ where: { orderId: order.id } }),
    ).resolves.toMatchObject({ status: "PENDING" });
    await expect(
      testPrisma.reservation.findUniqueOrThrow({
        where: { id: reservation.id },
      }),
    ).resolves.toMatchObject({ status: "COMMITTED" });
    await expect(
      testPrisma.productVariant.findUniqueOrThrow({
        where: { id: reservation.variantId },
      }),
    ).resolves.toMatchObject({ reserved: reservation.quantity });
    await expect(
      testPrisma.orderAuditLog.count({ where: { orderId: order.id } }),
    ).resolves.toBe(0);
  });

  it("rejects cancelling SHIPPED or DELIVERED fulfillment and leaves every row untouched", { timeout: CANCEL_TEST_TIMEOUT }, async () => {
    const user = await createUser();
    const shipped = await createOrder(user.id, {
      fulfillmentStatus: "SHIPPED",
    });
    const delivered = await createOrder(user.id, {
      fulfillmentStatus: "DELIVERED",
    });

    await expect(
      cancelOrder(shipped.id, { userId: user.id }),
    ).rejects.toThrow(OrderNotCancellableError);
    await expect(
      cancelOrder(delivered.id, { userId: user.id }),
    ).rejects.toThrow(OrderNotCancellableError);

    await expect(
      testPrisma.order.findUniqueOrThrow({ where: { id: shipped.id } }),
    ).resolves.toMatchObject({ status: "PENDING" });
    await expect(
      testPrisma.order.findUniqueOrThrow({ where: { id: delivered.id } }),
    ).resolves.toMatchObject({ status: "PENDING" });
    await expect(
      testPrisma.orderAuditLog.count({
        where: { orderId: { in: [shipped.id, delivered.id] } },
      }),
    ).resolves.toBe(0);
  });

  it("lets a guest cancel with the right token (audit actor null) and rejects wrong tokens", { timeout: CANCEL_TEST_TIMEOUT }, async () => {
    const token = nextToken("guest-cancel");
    const order = await createGuestOrder(token);

    await expect(
      cancelOrder(order.id, { guestToken: "wrong-token" }),
    ).rejects.toThrow(OrderNotFoundError);

    await cancelOrder(order.id, { guestToken: token });

    await expect(
      testPrisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).resolves.toMatchObject({
      status: "CANCELLED",
      fulfillmentStatus: "CANCELLED",
    });
    const audits = await testPrisma.orderAuditLog.findMany({
      where: { orderId: order.id },
    });
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      actorId: null,
      action: "ORDER_CANCELLED",
    });
  });

  it("rejects another user's order id and unknown ids without touching the owner's order", { timeout: CANCEL_TEST_TIMEOUT }, async () => {
    const owner = await createUser();
    const intruder = await createUser();
    const order = await createOrder(owner.id);

    await expect(
      cancelOrder(order.id, { userId: intruder.id }),
    ).rejects.toThrow(OrderNotFoundError);
    await expect(
      cancelOrder("missing-order", { userId: owner.id }),
    ).rejects.toThrow(OrderNotFoundError);
    await expect(cancelOrder(order.id, {})).rejects.toThrow(
      OrderNotFoundError,
    );

    const token = nextToken("guest-cancel");
    const guestOrder = await createGuestOrder(token);
    await expect(
      cancelOrder(guestOrder.id, { userId: owner.id }),
    ).rejects.toThrow(OrderNotFoundError);

    await expect(
      testPrisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).resolves.toMatchObject({ status: "PENDING" });
    await expect(
      testPrisma.order.findUniqueOrThrow({ where: { id: guestOrder.id } }),
    ).resolves.toMatchObject({ status: "PENDING" });
  });

  it("rejects a second cancel once the order is already CANCELLED", { timeout: CANCEL_TEST_TIMEOUT }, async () => {
    const user = await createUser();
    const { order } = await createCancellableOrder(user.id);

    await cancelOrder(order.id, { userId: user.id });
    await expect(cancelOrder(order.id, { userId: user.id })).rejects.toThrow(
      OrderNotCancellableError,
    );

    await expect(
      testPrisma.orderAuditLog.count({ where: { orderId: order.id } }),
    ).resolves.toBe(1);
  });
});
