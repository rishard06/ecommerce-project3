import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FulfillmentStatus } from "../types";

/**
 * The admin fulfillment suite covers two layers in one file:
 *
 * 1. The server action authorization/validation boundary (guards mocked, like
 *    `features/catalog/server/admin-actions.test.ts`).
 * 2. The real service state machine, audit trail, and transaction rollback
 *    against the disposable PostgreSQL test database.
 */

vi.mock("@/features/identity/server/guards", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/identity/server/guards")>();
  return {
    ...actual,
    requireAdmin: vi.fn(),
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
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
  getOrderForAdmin,
  InvalidFulfillmentTransitionError,
  listOrdersForAdmin,
  updateFulfillment,
} = await import("./admin-order-service");
const { updateFulfillmentAction } = await import("./fulfillment-actions");
const { ForbiddenError, UnauthorizedError, requireAdmin } = await import(
  "@/features/identity/server/guards"
);
const { revalidatePath } = await import("next/cache");

const requireAdminMock = vi.mocked(requireAdmin);
const revalidatePathMock = vi.mocked(revalidatePath);

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

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.append(key, value);
  }
  return data;
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

/** Mocks the guard with a real admin row so audit actor ids stay meaningful. */
async function signInAsAdmin() {
  const admin = await createUser("ADMIN");
  requireAdminMock.mockResolvedValue({
    id: admin.id,
    email: admin.email,
    role: "ADMIN",
  });
  return admin;
}

interface OrderFixtureOptions {
  createdAt?: Date;
  status?: "PENDING" | "PAID" | "CANCELLED";
  paymentStatus?: "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  fulfillmentStatus?: FulfillmentStatus;
}

async function createOrder(userId: string, options: OrderFixtureOptions = {}) {
  return testPrisma.order.create({
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
          status: options.paymentStatus ?? "PENDING",
          provider: "stripe",
          amountCents: 4818,
          currency: "USD",
        },
      },
    },
  });
}

async function fulfillmentState(orderId: string) {
  const order = await testPrisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { payment: true },
  });
  return {
    status: order.status,
    fulfillmentStatus: order.fulfillmentStatus,
    paymentStatus: order.payment?.status ?? null,
  };
}

beforeEach(async () => {
  vi.clearAllMocks();

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

describe("updateFulfillmentAction authorization", () => {
  it("rejects ANONYMOUS callers before any order or audit mutation", async () => {
    requireAdminMock.mockRejectedValue(new UnauthorizedError());
    const customer = await createUser();
    const order = await createOrder(customer.id);

    await expect(
      updateFulfillmentAction(form({ orderId: order.id, next: "PROCESSING" })),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    await expect(fulfillmentState(order.id)).resolves.toEqual({
      status: "PENDING",
      fulfillmentStatus: "UNFULFILLED",
      paymentStatus: "PENDING",
    });
    expect(await testPrisma.orderAuditLog.count()).toBe(0);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("rejects CUSTOMER role before any order or audit mutation", async () => {
    requireAdminMock.mockRejectedValue(new ForbiddenError());
    const customer = await createUser();
    const order = await createOrder(customer.id);

    await expect(
      updateFulfillmentAction(form({ orderId: order.id, next: "PROCESSING" })),
    ).rejects.toBeInstanceOf(ForbiddenError);

    await expect(fulfillmentState(order.id)).resolves.toEqual({
      status: "PENDING",
      fulfillmentStatus: "UNFULFILLED",
      paymentStatus: "PENDING",
    });
    expect(await testPrisma.orderAuditLog.count()).toBe(0);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

describe("updateFulfillmentAction validation", () => {
  it("rejects a missing orderId before any mutation", async () => {
    await signInAsAdmin();

    const result = await updateFulfillmentAction(form({ next: "PROCESSING" }));

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(await testPrisma.orderAuditLog.count()).toBe(0);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown target status before any mutation", async () => {
    await signInAsAdmin();
    const customer = await createUser();
    const order = await createOrder(customer.id);

    const result = await updateFulfillmentAction(
      form({ orderId: order.id, next: "TELEPORTED" }),
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    await expect(fulfillmentState(order.id)).resolves.toMatchObject({
      fulfillmentStatus: "UNFULFILLED",
    });
    expect(await testPrisma.orderAuditLog.count()).toBe(0);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

describe("updateFulfillmentAction valid linear transitions", () => {
  const linearTransitions = [
    ["UNFULFILLED", "PROCESSING"],
    ["PROCESSING", "SHIPPED"],
    ["SHIPPED", "DELIVERED"],
  ] as const;

  for (const [from, to] of linearTransitions) {
    it(`${from} → ${to} persists and writes exactly one audit row`, async () => {
      const admin = await signInAsAdmin();
      const customer = await createUser();
      const order = await createOrder(customer.id, {
        status: "PAID",
        paymentStatus: "SUCCEEDED",
        fulfillmentStatus: from,
      });
      const before = await fulfillmentState(order.id);

      const result = await updateFulfillmentAction(
        form({ orderId: order.id, next: to }),
      );

      expect(result).toEqual({ success: true });
      await expect(fulfillmentState(order.id)).resolves.toEqual({
        ...before,
        fulfillmentStatus: to,
      });

      const auditLogs = await testPrisma.orderAuditLog.findMany({
        where: { orderId: order.id },
      });
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toMatchObject({
        orderId: order.id,
        actorId: admin.id,
        action: "FULFILLMENT_UPDATED",
        fromStatus: from,
        toStatus: to,
      });
      expect(auditLogs[0].createdAt).toBeInstanceOf(Date);

      expect(revalidatePathMock).toHaveBeenCalledWith("/admin/orders");
      expect(revalidatePathMock).toHaveBeenCalledWith(
        `/admin/orders/${order.id}`,
      );
    });
  }
});

describe("updateFulfillmentAction cancellation", () => {
  for (const from of ["UNFULFILLED", "PROCESSING"] as const) {
    it(`allows cancellation from ${from} with one audit row`, async () => {
      const admin = await signInAsAdmin();
      const customer = await createUser();
      const order = await createOrder(customer.id, { fulfillmentStatus: from });

      const result = await updateFulfillmentAction(
        form({ orderId: order.id, next: "CANCELLED" }),
      );

      expect(result).toEqual({ success: true });
      await expect(fulfillmentState(order.id)).resolves.toMatchObject({
        fulfillmentStatus: "CANCELLED",
      });
      const auditLogs = await testPrisma.orderAuditLog.findMany({
        where: { orderId: order.id },
      });
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toMatchObject({
        actorId: admin.id,
        action: "FULFILLMENT_UPDATED",
        fromStatus: from,
        toStatus: "CANCELLED",
      });
    });
  }

  for (const from of ["SHIPPED", "DELIVERED", "CANCELLED"] as const) {
    it(`rejects cancellation from ${from} without mutating`, async () => {
      const admin = await createUser("ADMIN");
      const customer = await createUser();
      const order = await createOrder(customer.id, { fulfillmentStatus: from });

      await expect(
        updateFulfillment(order.id, "CANCELLED", admin.id),
      ).rejects.toBeInstanceOf(InvalidFulfillmentTransitionError);

      await expect(fulfillmentState(order.id)).resolves.toMatchObject({
        fulfillmentStatus: from,
      });
      expect(await testPrisma.orderAuditLog.count()).toBe(0);
    });
  }
});

describe("updateFulfillment state machine guards", () => {
  it("rejects same-state transitions without writing", async () => {
    const admin = await createUser("ADMIN");
    const customer = await createUser();

    for (const current of [
      "UNFULFILLED",
      "PROCESSING",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
    ] as const) {
      const order = await createOrder(customer.id, {
        fulfillmentStatus: current,
      });

      await expect(
        updateFulfillment(order.id, current, admin.id),
      ).rejects.toBeInstanceOf(InvalidFulfillmentTransitionError);

      await expect(fulfillmentState(order.id)).resolves.toMatchObject({
        fulfillmentStatus: current,
      });
      expect(await testPrisma.orderAuditLog.count()).toBe(0);
    }
  });

  it("rejects backward transitions without writing", async () => {
    const admin = await createUser("ADMIN");
    const customer = await createUser();

    for (const [from, to] of [
      ["PROCESSING", "UNFULFILLED"],
      ["SHIPPED", "PROCESSING"],
      ["DELIVERED", "SHIPPED"],
      ["CANCELLED", "PROCESSING"],
    ] as const) {
      const order = await createOrder(customer.id, {
        fulfillmentStatus: from,
      });

      await expect(
        updateFulfillment(order.id, to, admin.id),
      ).rejects.toBeInstanceOf(InvalidFulfillmentTransitionError);

      await expect(fulfillmentState(order.id)).resolves.toMatchObject({
        fulfillmentStatus: from,
      });
      expect(await testPrisma.orderAuditLog.count()).toBe(0);
    }
  });

  it("rejects skipped linear transitions without writing", async () => {
    const admin = await createUser("ADMIN");
    const customer = await createUser();

    for (const [from, to] of [
      ["UNFULFILLED", "SHIPPED"],
      ["UNFULFILLED", "DELIVERED"],
      ["PROCESSING", "DELIVERED"],
    ] as const) {
      const order = await createOrder(customer.id, {
        fulfillmentStatus: from,
      });

      await expect(
        updateFulfillment(order.id, to, admin.id),
      ).rejects.toBeInstanceOf(InvalidFulfillmentTransitionError);

      await expect(fulfillmentState(order.id)).resolves.toMatchObject({
        fulfillmentStatus: from,
      });
      expect(await testPrisma.orderAuditLog.count()).toBe(0);
    }
  });

  it("surfaces an invalid transition through the action result", async () => {
    await signInAsAdmin();
    const customer = await createUser();
    const order = await createOrder(customer.id, {
      fulfillmentStatus: "UNFULFILLED",
    });

    const result = await updateFulfillmentAction(
      form({ orderId: order.id, next: "DELIVERED" }),
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/cannot change fulfillment/i);
    await expect(fulfillmentState(order.id)).resolves.toMatchObject({
      fulfillmentStatus: "UNFULFILLED",
    });
    expect(await testPrisma.orderAuditLog.count()).toBe(0);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

describe("updateFulfillment atomicity", () => {
  it("rolls back the order update when the audit insert fails", async () => {
    const admin = await createUser("ADMIN");
    const customer = await createUser();
    const order = await createOrder(customer.id);

    // Force the audit insert to fail inside the same transaction. If the
    // status update is not rolled back, the order would be left PROCESSING
    // with no audit row — an impossible, unaudited history.
    await testPrisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION fail_order_audit_insert()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'forced audit failure';
      END;
      $$ LANGUAGE plpgsql;
    `);
    await testPrisma.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS fail_order_audit_insert_trigger ON "OrderAuditLog";
    `);
    await testPrisma.$executeRawUnsafe(`
      CREATE TRIGGER fail_order_audit_insert_trigger
      BEFORE INSERT ON "OrderAuditLog"
      FOR EACH ROW EXECUTE FUNCTION fail_order_audit_insert();
    `);

    try {
      await expect(
        updateFulfillment(order.id, "PROCESSING", admin.id),
      ).rejects.toThrow(/forced audit failure/i);
    } finally {
      await testPrisma.$executeRawUnsafe(`
        DROP TRIGGER IF EXISTS fail_order_audit_insert_trigger ON "OrderAuditLog";
      `);
      await testPrisma.$executeRawUnsafe(`
        DROP FUNCTION IF EXISTS fail_order_audit_insert();
      `);
    }

    await expect(fulfillmentState(order.id)).resolves.toMatchObject({
      fulfillmentStatus: "UNFULFILLED",
    });
    expect(await testPrisma.orderAuditLog.count()).toBe(0);
  });

  it("allows only one of two concurrent transitions from the same state", async () => {
    const admin = await createUser("ADMIN");
    const customer = await createUser();
    const order = await createOrder(customer.id);

    const results = await Promise.allSettled([
      updateFulfillment(order.id, "PROCESSING", admin.id),
      updateFulfillment(order.id, "PROCESSING", admin.id),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(
      1,
    );
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(
      1,
    );
    await expect(fulfillmentState(order.id)).resolves.toMatchObject({
      fulfillmentStatus: "PROCESSING",
    });
    expect(await testPrisma.orderAuditLog.count()).toBe(1);
  });
});

describe("admin order reads", () => {
  it("lists every customer's orders newest first with email, totals, and payment status", async () => {
    const first = await createUser();
    const second = await createUser();

    const older = await createOrder(first.id, {
      createdAt: new Date("2026-01-01T10:00:00.000Z"),
      status: "PAID",
      paymentStatus: "SUCCEEDED",
      fulfillmentStatus: "PROCESSING",
    });
    const newer = await createOrder(second.id, {
      createdAt: new Date("2026-02-01T10:00:00.000Z"),
    });

    const orders = await listOrdersForAdmin();

    expect(orders.map((order) => order.id)).toEqual([newer.id, older.id]);
    expect(orders[0]).toMatchObject({
      customerEmail: second.email,
      status: "PENDING",
      fulfillmentStatus: "UNFULFILLED",
      paymentStatus: "PENDING",
      currency: "USD",
      totalCents: 4818,
    });
    expect(orders[1]).toMatchObject({
      customerEmail: first.email,
      status: "PAID",
      paymentStatus: "SUCCEEDED",
      totalCents: 4818,
    });
  });

  it("returns a full admin detail with items, shipping, payment, and audit history", async () => {
    const admin = await createUser("ADMIN");
    const customer = await createUser();
    const order = await createOrder(customer.id, {
      status: "PAID",
      paymentStatus: "SUCCEEDED",
      fulfillmentStatus: "PROCESSING",
    });

    await testPrisma.orderAuditLog.create({
      data: {
        orderId: order.id,
        actorId: admin.id,
        action: "FULFILLMENT_UPDATED",
        fromStatus: "UNFULFILLED",
        toStatus: "PROCESSING",
      },
    });

    const detail = await getOrderForAdmin(order.id);

    expect(detail).toMatchObject({
      id: order.id,
      customerEmail: customer.email,
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
    expect(detail?.auditLogs).toHaveLength(1);
    expect(detail?.auditLogs[0]).toMatchObject({
      actorId: admin.id,
      action: "FULFILLMENT_UPDATED",
      fromStatus: "UNFULFILLED",
      toStatus: "PROCESSING",
    });
  });

  it("returns null for a missing order", async () => {
    await expect(getOrderForAdmin("missing-order")).resolves.toBeNull();
  });
});
