import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { PrismaClient } from "@/app/generated/prisma";
import type Stripe from "stripe";

/**
 * Ticket #14: money-path proof. The email provider throws, the order and
 * payment still succeed — email never blocks money.
 *
 * Unlike `process-stripe-event.test.ts` (which mocks `sendOrderConfirmation`
 * wholesale), this suite runs the REAL confirmation module against a throwing
 * email client: `sendEmail` rejects, `sendOrderConfirmation` must still
 * resolve, and `processStripeEvent` must leave the order PAID with a
 * SUCCEEDED payment.
 */

vi.mock("@/lib/email/client", () => ({
  sendEmail: vi.fn(async () => {
    throw new Error("provider down");
  }),
}));

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

const { processStripeEvent } = await import("./process-stripe-event");
const { sendEmail } = await import("@/lib/email/client");

const sendEmailMock = vi.mocked(sendEmail);

let sequence = 0;
function nextToken(prefix: string): string {
  sequence += 1;
  return `${prefix}-${sequence}`;
}

async function createPaidFixture(options: { guest?: boolean } = {}) {
  const token = nextToken("besteffort");
  const quantity = 2;
  const priceCents = 1999;

  const user = options.guest
    ? null
    : await testPrisma.user.create({
        data: {
          id: `user-${token}`,
          name: "Test User",
          email: `user-${token}@example.com`,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

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
      priceCents,
      onHand: 10,
      reserved: quantity,
    },
  });

  const order = await testPrisma.order.create({
    data: {
      userId: user?.id ?? null,
      guestToken: options.guest ? `guest-${token}` : undefined,
      guestEmail: options.guest ? `guest-${token}@example.com` : undefined,
      guestEmailOptIn: options.guest ? true : false,
      status: "PENDING",
      fulfillmentStatus: "UNFULFILLED",
      currency: "USD",
      subtotalCents: priceCents * quantity,
      shippingCents: 0,
      taxCents: 0,
      totalCents: priceCents * quantity,
      shippingFullName: "Jane Doe",
      shippingLine1: "123 Main Street",
      shippingCity: "Springfield",
      shippingRegion: "IL",
      shippingPostalCode: "62701",
      shippingCountry: "US",
      items: {
        create: {
          variantId: variant.id,
          productSlug: product.slug,
          sku: variant.sku,
          title: product.title,
          unitPriceCents: priceCents,
          quantity,
          lineTotalCents: priceCents * quantity,
        },
      },
      payment: {
        create: {
          provider: "stripe",
          status: "PENDING",
          amountCents: priceCents * quantity,
          currency: "USD",
        },
      },
      reservations: {
        create: {
          variantId: variant.id,
          quantity,
          status: "ACTIVE",
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      },
    },
  });

  return { order, variant };
}

function paidEvent(orderId: string): Stripe.Event {
  return {
    id: nextToken("evt"),
    object: "event",
    api_version: "2025-01-27.acacia",
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: "cs_test_best_effort",
        object: "checkout.session",
        metadata: { orderId },
        payment_status: "paid",
        payment_intent: "pi_test_best_effort",
      },
    },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type: "checkout.session.completed",
  } as unknown as Stripe.Event;
}

beforeEach(async () => {
  vi.clearAllMocks();

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

describe("order confirmation best-effort (real webhook, throwing email)", () => {
  // The disposable database is remote: fixture setup + the webhook
  // transaction can exceed the 5s default timeout. Generous per-test
  // timeouts keep a slow network from orphaning async work into the next
  // test (which would double-count the shared sendEmail mock).
  it(
    "signed-in: send throws, order still PAID and payment still SUCCEEDED",
    async () => {
      const { order, variant } = await createPaidFixture();

      await expect(
        processStripeEvent(paidEvent(order.id)),
      ).resolves.toBeUndefined();

      expect(sendEmailMock).toHaveBeenCalledTimes(1);

      const updatedOrder = await testPrisma.order.findUniqueOrThrow({
        where: { id: order.id },
      });
      const payment = await testPrisma.payment.findUniqueOrThrow({
        where: { orderId: order.id },
      });
      const updatedVariant = await testPrisma.productVariant.findUniqueOrThrow({
        where: { id: variant.id },
      });

      expect(updatedOrder.status).toBe("PAID");
      expect(payment.status).toBe("SUCCEEDED");
      expect(updatedVariant.onHand).toBe(8);
      expect(updatedVariant.reserved).toBe(0);
    },
    60000,
  );

  it(
    "guest opt-in: send throws, order still PAID and payment still SUCCEEDED",
    async () => {
      const { order } = await createPaidFixture({ guest: true });

      await expect(
        processStripeEvent(paidEvent(order.id)),
      ).resolves.toBeUndefined();

      expect(sendEmailMock).toHaveBeenCalledTimes(1);
      expect(sendEmailMock).toHaveBeenCalledWith(
        expect.objectContaining({ to: order.guestEmail }),
      );

      const updatedOrder = await testPrisma.order.findUniqueOrThrow({
        where: { id: order.id },
      });
      const payment = await testPrisma.payment.findUniqueOrThrow({
        where: { orderId: order.id },
      });

      expect(updatedOrder.status).toBe("PAID");
      expect(payment.status).toBe("SUCCEEDED");
    },
    60000,
  );
});
