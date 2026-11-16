import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FulfillmentStatus } from "../types";

/**
 * Task 18: SHIPPED / DELIVERED status emails.
 *
 * Covers the email side of the admin fulfillment flow: SHIPPED sends once,
 * DELIVERED sends once, every other transition sends nothing, and a
 * retry/duplicate transition never resends (the state machine rejects it, so
 * the send line is unreachable). Email is best-effort and never changes
 * payment state.
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

vi.mock("@/lib/email/client", () => ({
  sendEmail: vi.fn(),
}));

import { PrismaClient } from "@/app/generated/prisma";

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
process.env.DATABASE_URL = testDatabaseUrl;

const testPrisma = new PrismaClient({
  datasourceUrl: `${testDatabaseUrl}${testDatabaseUrl.includes("?") ? "&" : "?"}connection_limit=1`,
});

const TEST_DATABASE_LOCK_KEY = 728674001;

const { updateFulfillmentAction } = await import("./fulfillment-actions");
const { requireAdmin } = await import(
  "@/features/identity/server/guards"
);
const { sendEmail } = await import("@/lib/email/client");

const requireAdminMock = vi.mocked(requireAdmin);
const sendEmailMock = vi.mocked(sendEmail);

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
  status?: "PENDING" | "PAID" | "CANCELLED";
  paymentStatus?: "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  fulfillmentStatus?: FulfillmentStatus;
  guest?: boolean;
}

async function createOrder(userId: string | null, options: OrderFixtureOptions = {}) {
  return testPrisma.order.create({
    data: {
      userId,
      guestToken: userId ? null : nextToken("guest"),
      status: options.status ?? "PAID",
      fulfillmentStatus: options.fulfillmentStatus ?? "UNFULFILLED",
      currency: "USD",
      subtotalCents: 3998,
      shippingCents: 500,
      taxCents: 320,
      totalCents: 4818,
      discountCents: 0,
      couponCode: null,
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
          status: options.paymentStatus ?? "SUCCEEDED",
          provider: "stripe",
          amountCents: 4818,
          currency: "USD",
        },
      },
    },
  });
}

beforeEach(async () => {
  vi.clearAllMocks();
  sendEmailMock.mockResolvedValue({ id: "test-email-id" });

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

describe("fulfillment status emails (Task 18)", () => {
  it("sends exactly one email on PROCESSING → SHIPPED without touching payment state", async () => {
    await signInAsAdmin();
    const customer = await createUser();
    const order = await createOrder(customer.id, {
      fulfillmentStatus: "PROCESSING",
    });

    const result = await updateFulfillmentAction(
      form({ orderId: order.id, next: "SHIPPED" }),
    );

    expect(result).toEqual({ success: true });
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: customer.email }),
    );

    const updated = await testPrisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { payment: true },
    });
    expect(updated.fulfillmentStatus).toBe("SHIPPED");
    expect(updated.status).toBe("PAID");
    expect(updated.payment?.status).toBe("SUCCEEDED");
  });

  it("sends exactly one email on SHIPPED → DELIVERED without touching payment state", async () => {
    await signInAsAdmin();
    const customer = await createUser();
    const order = await createOrder(customer.id, {
      fulfillmentStatus: "SHIPPED",
    });

    const result = await updateFulfillmentAction(
      form({ orderId: order.id, next: "DELIVERED" }),
    );

    expect(result).toEqual({ success: true });
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: customer.email }),
    );

    const updated = await testPrisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { payment: true },
    });
    expect(updated.fulfillmentStatus).toBe("DELIVERED");
    expect(updated.status).toBe("PAID");
    expect(updated.payment?.status).toBe("SUCCEEDED");
  });

  it("sends nothing on UNFULFILLED → PROCESSING", async () => {
    await signInAsAdmin();
    const customer = await createUser();
    const order = await createOrder(customer.id);

    const result = await updateFulfillmentAction(
      form({ orderId: order.id, next: "PROCESSING" }),
    );

    expect(result).toEqual({ success: true });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("sends nothing on cancellation", async () => {
    await signInAsAdmin();
    const customer = await createUser();
    const order = await createOrder(customer.id);

    const result = await updateFulfillmentAction(
      form({ orderId: order.id, next: "CANCELLED" }),
    );

    expect(result).toEqual({ success: true });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("never resends on a duplicate transition (exactly-once)", async () => {
    await signInAsAdmin();
    const customer = await createUser();
    const order = await createOrder(customer.id, {
      fulfillmentStatus: "PROCESSING",
    });

    const first = await updateFulfillmentAction(
      form({ orderId: order.id, next: "SHIPPED" }),
    );
    expect(first).toEqual({ success: true });
    expect(sendEmailMock).toHaveBeenCalledTimes(1);

    // Retry of the same transition is rejected by the state machine and must
    // not produce a second email.
    const retry = await updateFulfillmentAction(
      form({ orderId: order.id, next: "SHIPPED" }),
    );
    expect(retry.success).toBe(false);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("succeeds without email for guest orders (no stored email address)", async () => {
    await signInAsAdmin();
    const order = await createOrder(null, {
      fulfillmentStatus: "PROCESSING",
    });

    const result = await updateFulfillmentAction(
      form({ orderId: order.id, next: "SHIPPED" }),
    );

    expect(result).toEqual({ success: true });
    const updated = await testPrisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(updated.fulfillmentStatus).toBe("SHIPPED");
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("still succeeds when the email provider fails (best-effort)", async () => {
    await signInAsAdmin();
    const customer = await createUser();
    const order = await createOrder(customer.id, {
      fulfillmentStatus: "PROCESSING",
    });
    sendEmailMock.mockRejectedValueOnce(new Error("provider down"));

    const result = await updateFulfillmentAction(
      form({ orderId: order.id, next: "SHIPPED" }),
    );

    expect(result).toEqual({ success: true });
    const updated = await testPrisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(updated.fulfillmentStatus).toBe("SHIPPED");
  });
});
