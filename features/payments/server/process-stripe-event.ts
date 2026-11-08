import type { Prisma } from "@/app/generated/prisma";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { markCheckoutPaid, releaseCheckout } from "./payment-transitions";

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

function getOrderId(session: Stripe.Checkout.Session): string | null {
  const orderId = session.metadata?.orderId;
  return typeof orderId === "string" && orderId.length > 0 ? orderId : null;
}

function getPaymentIntentId(
  paymentIntent: Stripe.Checkout.Session["payment_intent"],
): string | null {
  if (typeof paymentIntent === "string") {
    return paymentIntent;
  }
  return paymentIntent?.id ?? null;
}

async function applyEvent(
  event: Stripe.Event,
  tx: Prisma.TransactionClient,
): Promise<void> {
  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.expired"
  ) {
    return;
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = getOrderId(session);

  if (!orderId) {
    console.warn(
      `Stripe webhook ${event.id} (${event.type}) has no metadata.orderId; ignoring.`,
    );
    return;
  }

  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: { id: true },
  });

  if (!order) {
    console.warn(
      `Stripe webhook ${event.id} (${event.type}) references an unknown order; ignoring.`,
    );
    return;
  }

  if (event.type === "checkout.session.expired") {
    await releaseCheckout(orderId, tx);
    return;
  }

  // A completed session only means the customer finished the flow. Payment is
  // real only when Stripe reports it as paid (or as requiring no payment).
  if (
    session.payment_status !== "paid" &&
    session.payment_status !== "no_payment_required"
  ) {
    return;
  }

  await markCheckoutPaid(orderId, session.id, tx);

  const paymentIntentId = getPaymentIntentId(session.payment_intent);
  if (paymentIntentId) {
    await tx.payment.updateMany({
      where: { orderId },
      data: { providerPaymentIntentId: paymentIntentId },
    });
  }
}

/**
 * Records and applies one Stripe event atomically.
 *
 * The unique `providerEventId` insert is the replay guard: a duplicate delivery
 * hits the constraint and the whole transaction (including any stock effects)
 * is rolled back, making the duplicate a successful no-op. Payment, order, and
 * stock changes therefore commit together with the event record, or not at
 * all.
 */
export async function processStripeEvent(event: Stripe.Event): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.webhookEvent.create({
        data: {
          providerEventId: event.id,
          type: event.type,
          payload: event as unknown as Prisma.InputJsonValue,
        },
      });

      await applyEvent(event, tx);

      await tx.webhookEvent.update({
        where: { providerEventId: event.id },
        data: { processedAt: new Date() },
      });
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      // A concurrent or repeated delivery already recorded this event. The
      // rollback removed this attempt's effects; the original wins.
      const existing = await prisma.webhookEvent.findUnique({
        where: { providerEventId: event.id },
        select: { id: true },
      });
      if (existing) {
        return;
      }
    }

    throw error;
  }
}
