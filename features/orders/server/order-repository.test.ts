import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@/app/generated/prisma";
import {
  createOrderRecord,
  createPaymentRecord,
  createReservations,
  findOrderIdByIdempotencyKey,
  reserveVariantStock,
} from "./order-repository";
import {
  InsufficientStockError,
  type CreateOrderRecordInput,
} from "../types";

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
// One pooled connection keeps the advisory-lock session alive for the suite.
const testPrisma = new PrismaClient({
  datasourceUrl: `${testDatabaseUrl}${testDatabaseUrl.includes("?") ? "&" : "?"}connection_limit=1`,
});

const TEST_DATABASE_LOCK_KEY = 728674001;

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

async function createVariant(options: { onHand?: number; reserved?: number } = {}) {
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
      priceCents: 1999,
      onHand: options.onHand ?? 10,
      reserved: options.reserved ?? 0,
    },
  });

  return { category, product, variant };
}

function orderInput(
  userId: string,
  variantId: string,
  overrides: Partial<CreateOrderRecordInput> = {},
): CreateOrderRecordInput {
  return {
    userId,
    idempotencyKey: "key-1",
    currency: "USD",
    subtotalCents: 3998,
    shippingCents: 0,
    taxCents: 60,
    totalCents: 4058,
    shipping: SHIPPING,
    items: [
      {
        variantId,
        productSlug: "product-slug",
        sku: "sku-1",
        title: "Product",
        unitPriceCents: 1999,
        quantity: 2,
        lineTotalCents: 3998,
      },
    ],
    ...overrides,
  };
}

beforeEach(async () => {
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

describe("findOrderIdByIdempotencyKey", () => {
  it("finds an order only for the owning user and matching key", async () => {
    const user = await createUser();
    const otherUser = await createUser();
    const { variant } = await createVariant();

    const order = await testPrisma.$transaction((tx) =>
      createOrderRecord(tx, orderInput(user.id, variant.id)),
    );

    const found = await testPrisma.$transaction((tx) =>
      findOrderIdByIdempotencyKey(tx, user.id, "key-1"),
    );

    expect(found?.id).toBe(order.id);
    expect(found?.items).toHaveLength(1);

    await expect(
      testPrisma.$transaction((tx) =>
        findOrderIdByIdempotencyKey(tx, user.id, "different-key"),
      ),
    ).resolves.toBeNull();
    await expect(
      testPrisma.$transaction((tx) =>
        findOrderIdByIdempotencyKey(tx, otherUser.id, "key-1"),
      ),
    ).resolves.toBeNull();
  });
});

describe("reserveVariantStock", () => {
  it("increments reserved atomically when enough stock is available", async () => {
    const { variant } = await createVariant({ onHand: 5, reserved: 1 });

    await testPrisma.$transaction((tx) =>
      reserveVariantStock(tx, variant.id, 2),
    );

    const reloaded = await testPrisma.productVariant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    expect(reloaded.reserved).toBe(3);
  });

  it("throws InsufficientStockError and leaves reserved unchanged when stock is short", async () => {
    const { variant } = await createVariant({ onHand: 5, reserved: 4 });

    const error = await testPrisma
      .$transaction((tx) => reserveVariantStock(tx, variant.id, 2))
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(InsufficientStockError);
    expect((error as Error).message).toContain(variant.id);

    const reloaded = await testPrisma.productVariant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    expect(reloaded.reserved).toBe(4);
  });
});

describe("order record helpers", () => {
  it("creates the pending order with immutable snapshots and nested items", async () => {
    const user = await createUser();
    const { variant } = await createVariant();

    const order = await testPrisma.$transaction((tx) =>
      createOrderRecord(tx, orderInput(user.id, variant.id)),
    );

    expect(order).toMatchObject({
      userId: user.id,
      status: "PENDING",
      fulfillmentStatus: "UNFULFILLED",
      currency: "USD",
      subtotalCents: 3998,
      shippingCents: 0,
      taxCents: 60,
      totalCents: 4058,
      idempotencyKey: "key-1",
      shippingFullName: "Jane Doe",
      shippingLine1: "123 Main Street",
      shippingLine2: null,
      shippingCity: "Springfield",
      shippingRegion: "IL",
      shippingPostalCode: "62701",
      shippingCountry: "US",
    });

    const items = await testPrisma.orderItem.findMany({
      where: { orderId: order.id },
    });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      variantId: variant.id,
      productSlug: "product-slug",
      sku: "sku-1",
      title: "Product",
      unitPriceCents: 1999,
      quantity: 2,
      lineTotalCents: 3998,
    });
  });

  it("creates a pending payment and active reservations", async () => {
    const user = await createUser();
    const first = await createVariant();
    const second = await createVariant();

    const order = await testPrisma.$transaction((tx) =>
      createOrderRecord(
        tx,
        orderInput(user.id, first.variant.id, {
          items: [
            orderInput(user.id, first.variant.id).items[0],
            {
              variantId: second.variant.id,
              productSlug: "second-slug",
              sku: "sku-2",
              title: "Second product",
              unitPriceCents: 500,
              quantity: 1,
              lineTotalCents: 500,
            },
          ],
        }),
      ),
    );

    const payment = await testPrisma.$transaction((tx) =>
      createPaymentRecord(tx, {
        orderId: order.id,
        amountCents: 4058,
        currency: "USD",
      }),
    );
    expect(payment).toMatchObject({
      orderId: order.id,
      status: "PENDING",
      provider: "stripe",
      amountCents: 4058,
      currency: "USD",
    });

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const result = await testPrisma.$transaction((tx) =>
      createReservations(tx, {
        orderId: order.id,
        expiresAt,
        items: [
          { variantId: first.variant.id, quantity: 2 },
          { variantId: second.variant.id, quantity: 1 },
        ],
      }),
    );
    expect(result.count).toBe(2);

    const reservations = await testPrisma.reservation.findMany({
      where: { orderId: order.id },
      orderBy: { variantId: "asc" },
    });
    expect(reservations).toHaveLength(2);
    expect(reservations[0]).toMatchObject({
      status: "ACTIVE",
      expiresAt,
      orderId: order.id,
    });
    expect(reservations.map((reservation) => reservation.quantity).sort()).toEqual([
      1, 2,
    ]);
  });
});
