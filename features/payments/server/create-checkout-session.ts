import type Stripe from "stripe";
import { getPublicEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { getStripe } from "./stripe-client";

const DEFAULT_APP_URL = "http://localhost:3000";

/**
 * Controlled checkout failure whose message is safe to show to the customer.
 * It never contains provider details, secret keys, or order data.
 */
export class CheckoutSessionError extends Error {
  constructor(message = "Unable to start checkout") {
    super(message);
    this.name = "CheckoutSessionError";
  }
}

function getAppUrl(): string {
  return (getPublicEnv().NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL).replace(
    /\/$/,
    "",
  );
}

/**
 * Starts a hosted Stripe Checkout session for a pending order.
 *
 * Every amount and line-item value comes from the immutable order snapshots
 * written at checkout time; nothing is accepted from the browser. A successful
 * redirect never marks the order paid — Stripe webhooks are the only payment
 * truth (Task 9).
 */
export async function createCheckoutSession(
  orderId: string,
): Promise<{ url: string }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, payment: true },
  });

  if (
    !order ||
    order.status !== "PENDING" ||
    order.items.length === 0 ||
    !order.payment ||
    order.payment.status !== "PENDING" ||
    order.payment.amountCents !== order.totalCents
  ) {
    throw new CheckoutSessionError();
  }

  const appUrl = getAppUrl();

  // Products are charged exactly as snapshotted. Tax and shipping are added
  // as separate lines so the hosted Checkout total matches the order total.
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
    order.items.map((item) => ({
      price_data: {
        currency: "usd",
        unit_amount: item.unitPriceCents,
        product_data: {
          name: item.title,
          description: item.sku,
        },
      },
      quantity: item.quantity,
    }));

  if (order.taxCents > 0) {
    lineItems.push({
      price_data: {
        currency: "usd",
        unit_amount: order.taxCents,
        product_data: { name: "Tax" },
      },
      quantity: 1,
    });
  }

  if (order.shippingCents > 0) {
    lineItems.push({
      price_data: {
        currency: "usd",
        unit_amount: order.shippingCents,
        product_data: { name: "Shipping" },
      },
      quantity: 1,
    });
  }

  // Refuse to create a session that would charge a different amount than the
  // order snapshot. This guards against future drift in tax/shipping handling.
  const lineItemTotalCents = lineItems.reduce(
    (total, line) =>
      total + (line.price_data?.unit_amount ?? 0) * (line.quantity ?? 0),
    0,
  );
  if (lineItemTotalCents !== order.totalCents) {
    throw new CheckoutSessionError();
  }

  const session = await getStripe().checkout.sessions.create(
    {
      mode: "payment",
      line_items: lineItems,
      client_reference_id: order.id,
      metadata: { orderId: order.id },
      payment_intent_data: { metadata: { orderId: order.id } },
      success_url: `${appUrl}/checkout/success?orderId=${encodeURIComponent(order.id)}`,
      cancel_url: `${appUrl}/checkout/cancel?orderId=${encodeURIComponent(order.id)}`,
    },
    { idempotencyKey: `checkout-${order.id}` },
  );

  if (!session.url) {
    throw new CheckoutSessionError();
  }

  await prisma.payment.update({
    where: { orderId: order.id },
    data: { providerSessionId: session.id },
  });

  return { url: session.url };
}
