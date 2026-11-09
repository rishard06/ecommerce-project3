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
import type Stripe from "stripe";

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

// Test files share one disposable database, so serialize them with the same
// PostgreSQL advisory lock used by the checkout suite. A single pooled
// connection guarantees the session holding the lock stays alive until
// `afterAll`.
const testPrisma = new PrismaClient({
  datasourceUrl: `${testDatabaseUrl}${testDatabaseUrl.includes("?") ? "&" : "?"}connection_limit=1`,
});

// A separate pooled client lets the race regression open two real concurrent
// transactions instead of serializing them through the lock-holding client.
const racePrisma = new PrismaClient({ datasourceUrl: testDatabaseUrl });

const TEST_DATABASE_LOCK_KEY = 728674001;

const { processStripeEvent } = await import("./process-stripe-event");
const { markCheckoutPaid, releaseCheckout, sortReservationsForClaim } =
  await import("./payment-transitions");

let sequence = 0;
function nextToken(prefix: string): string {
  sequence += 1;
  return `${prefix}-${sequence}`;
}

interface OrderFixtureOptions {
  quantity?: number;
  priceCents?: number;
  onHand?: number;
  reserved?: number;
  paymentSessionId?: string | null;
  paymentStatus?: "PENDING" | "SUCCEEDED" | "CANCELLED" | "FAILED";
  reservationStatus?: "ACTIVE" | "COMMITTED" | "RELEASED";
}

/**
 * Creates a pending order with one active reservation, mirroring the state
 * Task 7 leaves behind: `reserved` already includes the held quantity.
 */
async function createOrderFixture(options: OrderFixtureOptions = {}) {
  const token = nextToken("webhook");
  const quantity = options.quantity ?? 2;
  const priceCents = options.priceCents ?? 1999;
  const totalCents = priceCents * quantity;

  const user = await testPrisma.user.create({
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
      onHand: options.onHand ?? 10,
      reserved: options.reserved ?? quantity,
    },
  });

  const order = await testPrisma.order.create({
    data: {
      userId: user.id,
      status: "PENDING",
      fulfillmentStatus: "UNFULFILLED",
      currency: "USD",
      subtotalCents: totalCents,
      shippingCents: 0,
      taxCents: 0,
      totalCents,
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
          lineTotalCents: totalCents,
        },
      },
      payment: {
        create: {
          provider: "stripe",
          providerSessionId: options.paymentSessionId ?? null,
          status: options.paymentStatus ?? "PENDING",
          amountCents: totalCents,
          currency: "USD",
        },
      },
      reservations: {
        create: {
          variantId: variant.id,
          quantity,
          status: options.reservationStatus ?? "ACTIVE",
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      },
    },
  });

  return { order, variant, totalCents };
}

async function loadState(orderId: string, variantId: string) {
  return {
    order: await testPrisma.order.findUniqueOrThrow({ where: { id: orderId } }),
    payment: await testPrisma.payment.findUniqueOrThrow({
      where: { orderId },
    }),
    reservations: await testPrisma.reservation.findMany({ where: { orderId } }),
    variant: await testPrisma.productVariant.findUniqueOrThrow({
      where: { id: variantId },
    }),
    events: await testPrisma.webhookEvent.findMany(),
  };
}

interface CheckoutEventOptions {
  eventId?: string;
  type?: "checkout.session.completed" | "checkout.session.expired";
  orderId?: string | null;
  sessionId?: string;
  paymentStatus?: "paid" | "unpaid" | "no_payment_required";
  paymentIntent?: string | null;
}

function checkoutSessionEvent(
  options: CheckoutEventOptions = {},
): Stripe.Event {
  const metadata = options.orderId ? { orderId: options.orderId } : {};
  const session = {
    id: options.sessionId ?? "cs_test_webhook_session",
    object: "checkout.session",
    client_reference_id: options.orderId ?? null,
    metadata,
    payment_status: options.paymentStatus ?? "paid",
    payment_intent: options.paymentIntent ?? "pi_test_webhook",
  };

  return {
    id: options.eventId ?? nextToken("evt"),
    object: "event",
    api_version: "2025-01-27.acacia",
    created: Math.floor(Date.now() / 1000),
    data: { object: session },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type: options.type ?? "checkout.session.completed",
  } as unknown as Stripe.Event;
}

beforeEach(async () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});

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
  await racePrisma.$disconnect();
});

describe("processStripeEvent checkout completion", () => {
  it("marks a paid order and commits each reserved unit exactly once", async () => {
    const { order, variant, totalCents } = await createOrderFixture();
    const event = checkoutSessionEvent({ orderId: order.id });

    await processStripeEvent(event);

    const state = await loadState(order.id, variant.id);

    expect(state.order.status).toBe("PAID");
    expect(state.order.fulfillmentStatus).toBe("UNFULFILLED");
    expect(state.payment.status).toBe("SUCCEEDED");
    expect(state.payment.providerSessionId).toBe("cs_test_webhook_session");
    expect(state.payment.providerPaymentIntentId).toBe("pi_test_webhook");
    expect(state.payment.amountCents).toBe(totalCents);
    expect(state.reservations).toHaveLength(1);
    expect(state.reservations[0].status).toBe("COMMITTED");
    expect(state.variant.onHand).toBe(8);
    expect(state.variant.reserved).toBe(0);

    expect(state.events).toHaveLength(1);
    expect(state.events[0]).toMatchObject({
      providerEventId: event.id,
      type: "checkout.session.completed",
    });
    expect(state.events[0].processedAt).not.toBeNull();
  });

  it("preserves an existing provider session id", async () => {
    const { order, variant } = await createOrderFixture({
      paymentSessionId: "cs_test_existing",
    });

    await processStripeEvent(
      checkoutSessionEvent({
        orderId: order.id,
        sessionId: "cs_test_webhook_session",
      }),
    );

    const state = await loadState(order.id, variant.id);
    expect(state.payment.providerSessionId).toBe("cs_test_existing");
    expect(state.order.status).toBe("PAID");
  });

  it("treats no_payment_required as paid", async () => {
    const { order, variant } = await createOrderFixture();

    await processStripeEvent(
      checkoutSessionEvent({
        orderId: order.id,
        paymentStatus: "no_payment_required",
      }),
    );

    const state = await loadState(order.id, variant.id);
    expect(state.order.status).toBe("PAID");
    expect(state.payment.status).toBe("SUCCEEDED");
    expect(state.variant.onHand).toBe(8);
    expect(state.variant.reserved).toBe(0);
  });

  it("records an unpaid completed session without paying the order", async () => {
    const { order, variant } = await createOrderFixture();
    const event = checkoutSessionEvent({
      orderId: order.id,
      paymentStatus: "unpaid",
    });

    await processStripeEvent(event);

    const state = await loadState(order.id, variant.id);
    expect(state.order.status).toBe("PENDING");
    expect(state.payment.status).toBe("PENDING");
    expect(state.reservations[0].status).toBe("ACTIVE");
    expect(state.variant.onHand).toBe(10);
    expect(state.variant.reserved).toBe(2);
    expect(state.events).toHaveLength(1);
    expect(state.events[0].processedAt).not.toBeNull();
  });
});

describe("processStripeEvent checkout expiry", () => {
  it("releases the hold without decrementing on-hand stock", async () => {
    const { order, variant } = await createOrderFixture();

    await processStripeEvent(
      checkoutSessionEvent({
        type: "checkout.session.expired",
        orderId: order.id,
      }),
    );

    const state = await loadState(order.id, variant.id);
    expect(state.order.status).toBe("CANCELLED");
    expect(state.payment.status).toBe("CANCELLED");
    expect(state.reservations[0].status).toBe("RELEASED");
    expect(state.variant.onHand).toBe(10);
    expect(state.variant.reserved).toBe(0);
    expect(state.events).toHaveLength(1);
    expect(state.events[0].processedAt).not.toBeNull();
  });

  it("does not release a paid order", async () => {
    const { order, variant } = await createOrderFixture();

    await processStripeEvent(checkoutSessionEvent({ orderId: order.id }));
    const paid = await loadState(order.id, variant.id);

    await processStripeEvent(
      checkoutSessionEvent({
        type: "checkout.session.expired",
        orderId: order.id,
      }),
    );

    const state = await loadState(order.id, variant.id);
    expect(state.order.status).toBe("PAID");
    expect(state.payment.status).toBe("SUCCEEDED");
    expect(state.reservations[0].status).toBe("COMMITTED");
    expect(state.variant.onHand).toBe(paid.variant.onHand);
    expect(state.variant.reserved).toBe(paid.variant.reserved);
    expect(state.events).toHaveLength(2);
  });

  it("releases the hold only once when an expiry is replayed", async () => {
    const { order, variant } = await createOrderFixture();

    await processStripeEvent(
      checkoutSessionEvent({
        type: "checkout.session.expired",
        orderId: order.id,
      }),
    );
    await processStripeEvent(
      checkoutSessionEvent({
        type: "checkout.session.expired",
        orderId: order.id,
      }),
    );

    const state = await loadState(order.id, variant.id);
    expect(state.order.status).toBe("CANCELLED");
    expect(state.reservations[0].status).toBe("RELEASED");
    expect(state.variant.reserved).toBe(0);
    expect(state.events).toHaveLength(2);
  });
});

describe("processStripeEvent replay safety", () => {
  it("returns successfully and changes nothing for a duplicate event id", async () => {
    const { order, variant } = await createOrderFixture();
    const event = checkoutSessionEvent({ orderId: order.id });

    await processStripeEvent(event);
    await expect(processStripeEvent(event)).resolves.toBeUndefined();

    const state = await loadState(order.id, variant.id);
    expect(state.order.status).toBe("PAID");
    expect(state.variant.onHand).toBe(8);
    expect(state.variant.reserved).toBe(0);
    expect(state.events).toHaveLength(1);
  });

  it("does not deduct stock again when a new event id replays a completed session", async () => {
    const { order, variant } = await createOrderFixture();

    await processStripeEvent(
      checkoutSessionEvent({
        eventId: "evt_completed_first",
        orderId: order.id,
        sessionId: "cs_test_same_session",
      }),
    );
    await processStripeEvent(
      checkoutSessionEvent({
        eventId: "evt_completed_replayed",
        orderId: order.id,
        sessionId: "cs_test_same_session",
      }),
    );

    const state = await loadState(order.id, variant.id);
    expect(state.order.status).toBe("PAID");
    expect(state.payment.status).toBe("SUCCEEDED");
    expect(state.reservations[0].status).toBe("COMMITTED");
    expect(state.variant.onHand).toBe(8);
    expect(state.variant.reserved).toBe(0);
    expect(state.events).toHaveLength(2);
    expect(state.events.every((event) => event.processedAt !== null)).toBe(true);
  });
});

describe("processStripeEvent ignored events", () => {
  it("records but ignores an event without an order id", async () => {
    const event = checkoutSessionEvent({
      orderId: null,
      type: "checkout.session.completed",
    });

    await expect(processStripeEvent(event)).resolves.toBeUndefined();

    const events = await testPrisma.webhookEvent.findMany();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      providerEventId: event.id,
      type: "checkout.session.completed",
    });
    expect(events[0].processedAt).not.toBeNull();
    expect(await testPrisma.order.count()).toBe(0);
  });

  it("records but ignores an event for an unknown order id", async () => {
    const event = checkoutSessionEvent({
      orderId: "missing-order-id",
      type: "checkout.session.expired",
    });

    await expect(processStripeEvent(event)).resolves.toBeUndefined();

    const events = await testPrisma.webhookEvent.findMany();
    expect(events).toHaveLength(1);
    expect(events[0].processedAt).not.toBeNull();
    expect(await testPrisma.order.count()).toBe(0);
    expect(await testPrisma.reservation.count()).toBe(0);
  });

  it("records every other event type without touching orders or stock", async () => {
    const { order, variant } = await createOrderFixture();
    const event = {
      ...checkoutSessionEvent({ orderId: order.id }),
      id: "evt_other_type",
      type: "payment_intent.succeeded",
    } as Stripe.Event;

    await processStripeEvent(event);

    const state = await loadState(order.id, variant.id);
    expect(state.order.status).toBe("PENDING");
    expect(state.payment.status).toBe("PENDING");
    expect(state.reservations[0].status).toBe("ACTIVE");
    expect(state.variant.onHand).toBe(10);
    expect(state.variant.reserved).toBe(2);
    expect(state.events).toHaveLength(1);
    expect(state.events[0].type).toBe("payment_intent.succeeded");
    expect(state.events[0].processedAt).not.toBeNull();
  });
});

describe("payment transition cleanup races", () => {
  it("does not pay an order whose hold was already released by cleanup", async () => {
    const { order, variant } = await createOrderFixture({
      onHand: 10,
      reserved: 0,
      reservationStatus: "RELEASED",
    });

    await markCheckoutPaid(order.id, "cs_test_late_payment", testPrisma);

    const state = await loadState(order.id, variant.id);
    expect(state.order.status).toBe("PENDING");
    expect(state.payment.status).toBe("PENDING");
    expect(state.reservations[0].status).toBe("RELEASED");
    expect(state.variant.onHand).toBe(10);
    expect(state.variant.reserved).toBe(0);

    // The late payment is detectable by operators, not silently discarded.
    const markers = await testPrisma.orderAuditLog.findMany({
      where: { orderId: order.id },
    });
    expect(markers).toHaveLength(1);
    expect(markers[0]).toMatchObject({
      action: "PAYMENT_AFTER_RELEASE",
      actorId: null,
      fromStatus: "PENDING",
      toStatus: "PENDING",
    });
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining(order.id),
    );
  });

  it("records a completed checkout on a cancelled order for reconciliation", async () => {
    const { order, variant } = await createOrderFixture();

    // Cancel through the real expiry path first: order CANCELLED, hold gone.
    await releaseCheckout(order.id, testPrisma);
    const cancelled = await loadState(order.id, variant.id);
    expect(cancelled.order.status).toBe("CANCELLED");

    await processStripeEvent(
      checkoutSessionEvent({ orderId: order.id, paymentStatus: "paid" }),
    );

    const state = await loadState(order.id, variant.id);
    expect(state.order.status).toBe("CANCELLED");
    expect(state.payment.status).toBe("CANCELLED");
    expect(state.reservations[0].status).toBe("RELEASED");
    expect(state.variant.onHand).toBe(cancelled.variant.onHand);
    expect(state.variant.reserved).toBe(0);

    const markers = await testPrisma.orderAuditLog.findMany({
      where: { orderId: order.id },
    });
    expect(markers).toHaveLength(1);
    expect(markers[0]).toMatchObject({
      action: "PAYMENT_AFTER_CANCELLATION",
      actorId: null,
      fromStatus: "CANCELLED",
      toStatus: "CANCELLED",
    });
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining(order.id),
    );
  });

  it("claims reservations in variantId then id order", () => {
    const sorted = sortReservationsForClaim([
      { id: "reservation-2", variantId: "variant-b" },
      { id: "reservation-1", variantId: "variant-a" },
      { id: "reservation-3", variantId: "variant-a" },
    ]);

    expect(sorted.map((reservation) => reservation.id)).toEqual([
      "reservation-1",
      "reservation-3",
      "reservation-2",
    ]);
  });

  it("keeps stock consistent when payment and release race on one order", async () => {
    const { order, variant } = await createOrderFixture();

    const results = await Promise.allSettled([
      racePrisma.$transaction((tx) =>
        markCheckoutPaid(order.id, "cs_test_race", tx),
      ),
      racePrisma.$transaction((tx) => releaseCheckout(order.id, tx)),
    ]);

    expect(results.some((result) => result.status === "fulfilled")).toBe(true);

    const state = await loadState(order.id, variant.id);
    expect(state.variant.onHand).toBeGreaterThanOrEqual(0);
    expect(state.variant.reserved).toBeGreaterThanOrEqual(0);
    expect(state.reservations).toHaveLength(1);

    if (state.order.status === "PAID") {
      expect(state.payment.status).toBe("SUCCEEDED");
      expect(state.reservations[0].status).toBe("COMMITTED");
      expect(state.variant.onHand).toBe(8);
      expect(state.variant.reserved).toBe(0);
    } else {
      expect(state.order.status).toBe("CANCELLED");
      expect(state.payment.status).toBe("CANCELLED");
      expect(state.reservations[0].status).toBe("RELEASED");
      expect(state.variant.onHand).toBe(10);
      expect(state.variant.reserved).toBe(0);
    }
  });

  it("never resurrects a cancelled payment", async () => {
    const { order, variant } = await createOrderFixture({
      paymentStatus: "CANCELLED",
    });

    await expect(
      processStripeEvent(checkoutSessionEvent({ orderId: order.id })),
    ).rejects.toThrow();

    const state = await loadState(order.id, variant.id);
    expect(state.order.status).toBe("PENDING");
    expect(state.payment.status).toBe("CANCELLED");
    expect(state.reservations[0].status).toBe("ACTIVE");
    expect(state.variant.onHand).toBe(10);
    expect(state.variant.reserved).toBe(2);
    expect(state.events).toHaveLength(0);
  });
});

describe("processStripeEvent atomicity", () => {
  it("rolls back the event record when a stock transition fails", async () => {
    // Corrupt the hold so the guarded decrement cannot succeed.
    const { order, variant } = await createOrderFixture({
      quantity: 2,
      reserved: 1,
    });

    await expect(
      processStripeEvent(checkoutSessionEvent({ orderId: order.id })),
    ).rejects.toThrow();

    const state = await loadState(order.id, variant.id);
    expect(state.order.status).toBe("PENDING");
    expect(state.payment.status).toBe("PENDING");
    expect(state.reservations[0].status).toBe("ACTIVE");
    expect(state.variant.onHand).toBe(10);
    expect(state.variant.reserved).toBe(1);
    expect(state.events).toHaveLength(0);
  });
});
