import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SECRET = "whsec_test_route_secret";

const mocks = vi.hoisted(() => ({
  processStripeEvent: vi.fn(),
}));

vi.mock("@/features/payments/server/process-stripe-event", () => ({
  processStripeEvent: mocks.processStripeEvent,
}));

vi.mock("@/lib/env", () => ({
  getServerEnv: () => ({ STRIPE_WEBHOOK_SECRET: SECRET }),
}));

// A real Stripe client is used only for offline signature generation and
// verification. No network request is made.
vi.mock("@/features/payments/server/stripe-client", async () => {
  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe("sk_test_route_signature_only");
  return { getStripe: () => stripe };
});

const { POST, runtime } = await import("./route");
const { getStripe } = await import("@/features/payments/server/stripe-client");

const stripe = getStripe();

function eventPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_route_completed",
    object: "event",
    api_version: "2025-01-27.acacia",
    created: 1760000000,
    data: {
      object: {
        id: "cs_test_route_session",
        object: "checkout.session",
        payment_status: "paid",
        payment_intent: "pi_test_route",
        metadata: { orderId: "order-route-1" },
      },
    },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type: "checkout.session.completed",
    ...overrides,
  };
}

function signedRequest(
  payload: string,
  options: { signature?: string | null } = {},
): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (options.signature !== null) {
    headers.set(
      "stripe-signature",
      options.signature ??
        stripe.webhooks.generateTestHeaderString({
          payload,
          secret: SECRET,
        }),
    );
  }

  return new Request("http://localhost:3000/api/webhooks/stripe", {
    method: "POST",
    headers,
    body: payload,
  });
}

beforeEach(() => {
  mocks.processStripeEvent.mockReset();
  mocks.processStripeEvent.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/webhooks/stripe", () => {
  it("runs on the Node.js runtime", () => {
    expect(runtime).toBe("nodejs");
  });

  it("accepts a correctly signed event and processes it once", async () => {
    const payload = JSON.stringify(eventPayload());

    const response = await POST(signedRequest(payload));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(mocks.processStripeEvent).toHaveBeenCalledTimes(1);
    expect(mocks.processStripeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "evt_route_completed",
        type: "checkout.session.completed",
      }),
    );
  });

  it("rejects a request without a stripe-signature header", async () => {
    const payload = JSON.stringify(eventPayload());

    const response = await POST(signedRequest(payload, { signature: null }));

    expect(response.status).toBe(400);
    expect(mocks.processStripeEvent).not.toHaveBeenCalled();
  });

  it("rejects an invalid signature before processing", async () => {
    const payload = JSON.stringify(eventPayload());
    const wrongSignature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: "whsec_wrong_secret",
    });

    const response = await POST(
      signedRequest(payload, { signature: wrongSignature }),
    );

    expect(response.status).toBe(400);
    expect(mocks.processStripeEvent).not.toHaveBeenCalled();
  });

  it("rejects a valid signature over different raw bytes", async () => {
    const signedPayload = JSON.stringify(eventPayload());
    const tamperedPayload = JSON.stringify(
      eventPayload({ id: "evt_tampered" }),
    );
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: signedPayload,
      secret: SECRET,
    });

    const response = await POST(
      signedRequest(tamperedPayload, { signature }),
    );

    expect(response.status).toBe(400);
    expect(mocks.processStripeEvent).not.toHaveBeenCalled();
  });

  it("returns 500 so Stripe retries when processing fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.processStripeEvent.mockRejectedValue(
      new Error("database unavailable"),
    );
    const payload = JSON.stringify(eventPayload());

    const response = await POST(signedRequest(payload));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Webhook processing failed",
    });
    expect(errorSpy).toHaveBeenCalled();
  });

  it("exports POST only", async () => {
    const routeModule = await import("./route");
    expect(routeModule.POST).toBeTypeOf("function");
    expect("GET" in routeModule).toBe(false);
  });
});
