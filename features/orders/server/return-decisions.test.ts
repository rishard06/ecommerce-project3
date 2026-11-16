import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Task 15 RED: admin return approve (refund) + reject.
 *
 * Covers the admin decision on a customer's `ReturnRequest` (Task 14):
 *
 * 1. Approving a PENDING request issues exactly one Stripe refund via the
 *    existing `refundPayment` (`idempotencyKey: refund-{orderId}`), marks the
 *    request APPROVED, and moves the order to CANCELLED.
 * 2. A second approve is a no-op: it returns already-approved without a
 *    second Stripe call (the PENDING -> APPROVED claim is conditional, so
 *    concurrent approvers also issue a single refund).
 * 3. Approving with no request throws without touching Stripe.
 * 4. Rejecting a PENDING request marks it REJECTED with no refund and no
 *    order change; decisions after the first are no-ops either way.
 * 5. `refundPayment` still refuses DELIVERED orders unless the return was
 *    approved (the Task 13 gate stays intact for the generic refund path).
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
  OrderNotRefundableError,
  ReturnRequestNotFoundError,
  approveReturn,
  refundPayment,
  rejectReturn,
} = await import("./admin-order-service");
const { approveReturnAction, rejectReturnAction } = await import(
  "./fulfillment-actions"
);
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

/**
 * Mirrors delivered paid state: PAID + DELIVERED with a succeeded Stripe
 * intent, the state Task 14 allows return requests on. The COMMITTED
 * reservation mirrors the post-payment stock shape (sale recorded, onHand
 * 10 -> 8) so the approval refund proves the restock path for delivered
 * orders too.
 */
async function createDeliveredPaidOrder() {
  const customer = await createUser();
  const variant = await createVariant();

  const order = await testPrisma.order.create({
    data: {
      userId: customer.id,
      status: "PAID",
      fulfillmentStatus: "DELIVERED",
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
            variantId: variant.id,
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
          providerPaymentIntentId: `pi_${nextToken("intent")}`,
          amountCents: 4818,
          currency: "USD",
        },
      },
    },
  });

  const reservation = await testPrisma.reservation.create({
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

  return { order, reservation, variant };
}

async function createReturnRequest(
  orderId: string,
  status: "PENDING" | "APPROVED" | "REJECTED" = "PENDING",
) {
  return testPrisma.returnRequest.create({
    data: { orderId, reason: "Arrived damaged", status },
  });
}

beforeEach(async () => {
  vi.clearAllMocks();
  mocks.refundsCreate.mockReset();
  mocks.refundsCreate.mockResolvedValue({ id: "re_test_123" });

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

// DB-backed decision tests each perform 10+ sequential round trips to the
// disposable database, so they carry an explicit timeout instead of relying
// on the 5s default (a hang/deadlock would still exceed this quickly).
const DECISION_TEST_TIMEOUT = 30_000;

describe("approveReturn", () => {
  it("approves a PENDING request with one Stripe refund, CANCELLED order, and APPROVED request", { timeout: DECISION_TEST_TIMEOUT }, async () => {
    const admin = await createUser("ADMIN");
    const { order, variant } = await createDeliveredPaidOrder();
    await createReturnRequest(order.id);
    const payment = await testPrisma.payment.findUniqueOrThrow({
      where: { orderId: order.id },
    });

    const result = await approveReturn(order.id, admin.id);

    expect(result).toEqual({ approved: true, status: "APPROVED" });
    expect(mocks.refundsCreate).toHaveBeenCalledTimes(1);
    expect(mocks.refundsCreate).toHaveBeenCalledWith(
      { payment_intent: payment.providerPaymentIntentId },
      { idempotencyKey: `refund-${order.id}` },
    );

    await expect(
      testPrisma.returnRequest.findUniqueOrThrow({
        where: { orderId: order.id },
      }),
    ).resolves.toMatchObject({ status: "APPROVED" });
    await expect(
      testPrisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).resolves.toMatchObject({
      status: "CANCELLED",
      fulfillmentStatus: "CANCELLED",
    });
    await expect(
      testPrisma.payment.findUniqueOrThrow({ where: { orderId: order.id } }),
    ).resolves.toMatchObject({ status: "REFUNDED" });
    // The reversed delivered sale restocks onHand and releases the hold.
    await expect(
      testPrisma.productVariant.findUniqueOrThrow({
        where: { id: variant.id },
      }),
    ).resolves.toMatchObject({ onHand: 10, reserved: 0 });

    const audits = await testPrisma.orderAuditLog.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: "asc" },
    });
    expect(audits.map((entry) => entry.action)).toEqual([
      "RETURN_APPROVED",
      "ORDER_REFUNDED",
    ]);
    expect(audits[0]).toMatchObject({ actorId: admin.id });
    expect(audits[1]).toMatchObject({
      actorId: admin.id,
      action: "ORDER_REFUNDED",
      fromStatus: "PAID",
      toStatus: "CANCELLED",
    });
  });

  it("is a no-op on double-approve: no second Stripe call, no duplicate audit", { timeout: DECISION_TEST_TIMEOUT }, async () => {
    const admin = await createUser("ADMIN");
    const { order } = await createDeliveredPaidOrder();
    await createReturnRequest(order.id);

    const first = await approveReturn(order.id, admin.id);
    const second = await approveReturn(order.id, admin.id);

    expect(first).toEqual({ approved: true, status: "APPROVED" });
    expect(second).toEqual({ approved: false, status: "APPROVED" });
    expect(mocks.refundsCreate).toHaveBeenCalledTimes(1);
    await expect(
      testPrisma.orderAuditLog.count({ where: { orderId: order.id } }),
    ).resolves.toBe(2);
  });

  it("issues a single Stripe refund for two concurrent approves", { timeout: DECISION_TEST_TIMEOUT }, async () => {
    const admin = await createUser("ADMIN");
    const { order } = await createDeliveredPaidOrder();
    await createReturnRequest(order.id);

    const results = await Promise.allSettled([
      approveReturn(order.id, admin.id),
      approveReturn(order.id, admin.id),
    ]);

    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    const values = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value);
    expect(values.filter((v) => v.approved)).toHaveLength(1);
    expect(values.filter((v) => !v.approved)).toHaveLength(1);
    expect(mocks.refundsCreate).toHaveBeenCalledTimes(1);
  });

  it("throws without touching Stripe when no request exists", { timeout: DECISION_TEST_TIMEOUT }, async () => {
    const admin = await createUser("ADMIN");
    const { order } = await createDeliveredPaidOrder();

    await expect(approveReturn(order.id, admin.id)).rejects.toThrow(
      ReturnRequestNotFoundError,
    );

    expect(mocks.refundsCreate).not.toHaveBeenCalled();
    await expect(
      testPrisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).resolves.toMatchObject({ status: "PAID", fulfillmentStatus: "DELIVERED" });
    await expect(
      testPrisma.orderAuditLog.count({ where: { orderId: order.id } }),
    ).resolves.toBe(0);
  });

  it("is a no-op without Stripe after the request was rejected", { timeout: DECISION_TEST_TIMEOUT }, async () => {
    const admin = await createUser("ADMIN");
    const { order } = await createDeliveredPaidOrder();
    await createReturnRequest(order.id);
    await rejectReturn(order.id, admin.id);
    mocks.refundsCreate.mockClear();

    const result = await approveReturn(order.id, admin.id);

    expect(result).toEqual({ approved: false, status: "REJECTED" });
    expect(mocks.refundsCreate).not.toHaveBeenCalled();
    await expect(
      testPrisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).resolves.toMatchObject({ status: "PAID", fulfillmentStatus: "DELIVERED" });
  });
});

describe("rejectReturn", () => {
  it("rejects a PENDING request with no refund and no order change", { timeout: DECISION_TEST_TIMEOUT }, async () => {
    const admin = await createUser("ADMIN");
    const { order } = await createDeliveredPaidOrder();
    await createReturnRequest(order.id);

    const result = await rejectReturn(order.id, admin.id);

    expect(result).toEqual({ rejected: true, status: "REJECTED" });
    expect(mocks.refundsCreate).not.toHaveBeenCalled();
    await expect(
      testPrisma.returnRequest.findUniqueOrThrow({
        where: { orderId: order.id },
      }),
    ).resolves.toMatchObject({ status: "REJECTED" });
    await expect(
      testPrisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).resolves.toMatchObject({ status: "PAID", fulfillmentStatus: "DELIVERED" });
    await expect(
      testPrisma.payment.findUniqueOrThrow({ where: { orderId: order.id } }),
    ).resolves.toMatchObject({ status: "SUCCEEDED" });

    const audits = await testPrisma.orderAuditLog.findMany({
      where: { orderId: order.id },
    });
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      actorId: admin.id,
      action: "RETURN_REJECTED",
    });
  });

  it("is a no-op when rejecting an already-approved request", { timeout: DECISION_TEST_TIMEOUT }, async () => {
    const admin = await createUser("ADMIN");
    const { order } = await createDeliveredPaidOrder();
    await createReturnRequest(order.id);
    await approveReturn(order.id, admin.id);
    const auditsBefore = await testPrisma.orderAuditLog.count({
      where: { orderId: order.id },
    });

    const result = await rejectReturn(order.id, admin.id);

    expect(result).toEqual({ rejected: false, status: "APPROVED" });
    expect(mocks.refundsCreate).toHaveBeenCalledTimes(1);
    await expect(
      testPrisma.returnRequest.findUniqueOrThrow({
        where: { orderId: order.id },
      }),
    ).resolves.toMatchObject({ status: "APPROVED" });
    await expect(
      testPrisma.orderAuditLog.count({ where: { orderId: order.id } }),
    ).resolves.toBe(auditsBefore);
  });

  it("throws without writing when no request exists", { timeout: DECISION_TEST_TIMEOUT }, async () => {
    const admin = await createUser("ADMIN");
    const { order } = await createDeliveredPaidOrder();

    await expect(rejectReturn(order.id, admin.id)).rejects.toThrow(
      ReturnRequestNotFoundError,
    );

    expect(mocks.refundsCreate).not.toHaveBeenCalled();
    await expect(
      testPrisma.orderAuditLog.count({ where: { orderId: order.id } }),
    ).resolves.toBe(0);
  });
});

describe("refundPayment delivered gate (Task 13 behavior preserved)", () => {
  it("still refuses a DELIVERED order whose request is still PENDING", { timeout: DECISION_TEST_TIMEOUT }, async () => {
    const admin = await createUser("ADMIN");
    const { order } = await createDeliveredPaidOrder();
    await createReturnRequest(order.id);

    await expect(refundPayment(order.id, admin.id)).rejects.toThrow(
      OrderNotRefundableError,
    );

    expect(mocks.refundsCreate).not.toHaveBeenCalled();
    await expect(
      testPrisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).resolves.toMatchObject({ status: "PAID", fulfillmentStatus: "DELIVERED" });
  });

  it("still refuses a DELIVERED order with no request at all", { timeout: DECISION_TEST_TIMEOUT }, async () => {
    const admin = await createUser("ADMIN");
    const { order } = await createDeliveredPaidOrder();

    await expect(refundPayment(order.id, admin.id)).rejects.toThrow(
      OrderNotRefundableError,
    );

    expect(mocks.refundsCreate).not.toHaveBeenCalled();
  });
});

describe("return decision actions (admin boundary)", () => {
  it("rejects ANONYMOUS callers before any return or order mutation", async () => {
    requireAdminMock.mockRejectedValue(new UnauthorizedError());
    const customer = await createUser();
    const { order } = await createDeliveredPaidOrderForAction(customer.id);
    await createReturnRequest(order.id);

    await expect(
      approveReturnAction(form({ orderId: order.id })),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    requireAdminMock.mockRejectedValue(new ForbiddenError());
    await expect(
      rejectReturnAction(form({ orderId: order.id })),
    ).rejects.toBeInstanceOf(ForbiddenError);

    await expect(
      testPrisma.returnRequest.findUniqueOrThrow({
        where: { orderId: order.id },
      }),
    ).resolves.toMatchObject({ status: "PENDING" });
    expect(await testPrisma.orderAuditLog.count()).toBe(0);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("returns a validation error for a missing order id", async () => {
    await signInAsAdmin();

    const approved = await approveReturnAction(form({}));
    const rejected = await rejectReturnAction(form({}));

    expect(approved.success).toBe(false);
    expect(approved.error).toBeTruthy();
    expect(rejected.success).toBe(false);
    expect(rejected.error).toBeTruthy();
    expect(mocks.refundsCreate).not.toHaveBeenCalled();
    expect(await testPrisma.orderAuditLog.count()).toBe(0);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("surfaces a missing request as an error without touching Stripe", async () => {
    await signInAsAdmin();
    const customer = await createUser();
    const { order } = await createDeliveredPaidOrderForAction(customer.id);

    const result = await approveReturnAction(form({ orderId: order.id }));

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no return request/i);
    expect(mocks.refundsCreate).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("approves through the action: APPROVED + CANCELLED with revalidation", { timeout: DECISION_TEST_TIMEOUT }, async () => {
    await signInAsAdmin();
    const customer = await createUser();
    const { order } = await createDeliveredPaidOrderForAction(customer.id);
    await createReturnRequest(order.id);

    const result = await approveReturnAction(form({ orderId: order.id }));

    expect(result).toEqual({ success: true });
    expect(mocks.refundsCreate).toHaveBeenCalledTimes(1);
    await expect(
      testPrisma.returnRequest.findUniqueOrThrow({
        where: { orderId: order.id },
      }),
    ).resolves.toMatchObject({ status: "APPROVED" });
    await expect(
      testPrisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).resolves.toMatchObject({ status: "CANCELLED" });
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/orders");
    expect(revalidatePathMock).toHaveBeenCalledWith(
      `/admin/orders/${order.id}`,
    );
  });

  it("rejects through the action: REJECTED with no Stripe call", { timeout: DECISION_TEST_TIMEOUT }, async () => {
    await signInAsAdmin();
    const customer = await createUser();
    const { order } = await createDeliveredPaidOrderForAction(customer.id);
    await createReturnRequest(order.id);

    const result = await rejectReturnAction(form({ orderId: order.id }));

    expect(result).toEqual({ success: true });
    expect(mocks.refundsCreate).not.toHaveBeenCalled();
    await expect(
      testPrisma.returnRequest.findUniqueOrThrow({
        where: { orderId: order.id },
      }),
    ).resolves.toMatchObject({ status: "REJECTED" });
    await expect(
      testPrisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).resolves.toMatchObject({ status: "PAID", fulfillmentStatus: "DELIVERED" });
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/orders");
    expect(revalidatePathMock).toHaveBeenCalledWith(
      `/admin/orders/${order.id}`,
    );
  });
});

/**
 * Delivered + paid + succeeded-intent order owned by a given customer, for
 * the action-boundary tests (which assert the actor comes from the guard,
 * not from the fixture).
 */
async function createDeliveredPaidOrderForAction(userId: string) {
  const order = await testPrisma.order.create({
    data: {
      userId,
      status: "PAID",
      fulfillmentStatus: "DELIVERED",
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
          providerPaymentIntentId: `pi_${nextToken("intent")}`,
          amountCents: 4818,
          currency: "USD",
        },
      },
    },
  });

  return { order };
}
