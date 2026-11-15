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

interface PricedItem {
  title: string;
  sku: string;
  unitPriceCents: number;
  quantity: number;
}

/**
 * Nets a server-snapshotted coupon discount into the item lines so every
 * Stripe `unit_amount` stays a non-negative integer (live Stripe rejects
 * negative line amounts). The discount is distributed penny-by-penny across
 * individual units in line order, each unit floored at zero, and consecutive
 * identical units are regrouped into lines. Because the quote layer clamps
 * `discountCents <= subtotalCents`, the whole discount is always absorbed and
 * the regrouped item lines sum to exactly `subtotalCents - discountCents`.
 */
function buildDiscountedItemLines(
  items: PricedItem[],
  discountCents: number,
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  const units: Array<{ title: string; sku: string; amount: number }> = [];
  for (const item of items) {
    for (let n = 0; n < item.quantity; n += 1) {
      units.push({
        title: item.title,
        sku: item.sku,
        amount: item.unitPriceCents,
      });
    }
  }

  let remaining = discountCents;
  for (const unit of units) {
    if (remaining <= 0) {
      break;
    }
    const cut = Math.min(unit.amount, remaining);
    unit.amount -= cut;
    remaining -= cut;
  }

  const lines: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  let open: {
    title: string;
    sku: string;
    amount: number;
    quantity: number;
  } | null = null;
  const flush = () => {
    if (open) {
      lines.push({
        price_data: {
          currency: "usd",
          unit_amount: open.amount,
          product_data: { name: open.title, description: open.sku },
        },
        quantity: open.quantity,
      });
      open = null;
    }
  };
  for (const unit of units) {
    if (
      open &&
      open.title === unit.title &&
      open.sku === unit.sku &&
      open.amount === unit.amount
    ) {
      open.quantity += 1;
    } else {
      flush();
      open = {
        title: unit.title,
        sku: unit.sku,
        amount: unit.amount,
        quantity: 1,
      };
    }
  }
  flush();
  return lines;
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

  // A fully discounted order has nothing to charge. Stripe Checkout is a
  // payment flow, so refuse with a user-safe message instead of sending a
  // $0 session. Free-order fulfillment (zero-total bypass) is a parked
  // follow-up, deliberately not built here.
  if (order.totalCents === 0) {
    throw new CheckoutSessionError(
      "This order is fully covered by its coupon and needs no payment.",
    );
  }

  // Products are charged exactly as snapshotted, with any coupon discount
  // netted into the item lines (never a negative line amount). Tax and
  // shipping are added as separate lines so the hosted Checkout total
  // matches the order total.
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
    order.discountCents > 0
      ? buildDiscountedItemLines(order.items, order.discountCents)
      : order.items.map((item) => ({
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
  // order snapshot. This guards against future drift in tax/shipping handling
  // and verifies the distributed discount nets to exactly the order total.
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
      metadata: {
        orderId: order.id,
        ...(order.couponCode
          ? {
              couponCode: order.couponCode,
              discountCents: String(order.discountCents),
            }
          : {}),
      },
      payment_intent_data: {
        metadata: {
          orderId: order.id,
          ...(order.couponCode ? { couponCode: order.couponCode } : {}),
        },
      },
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
