import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getServerEnv } from "@/lib/env";
import { getStripe } from "@/features/payments/server/stripe-client";
import { processStripeEvent } from "@/features/payments/server/process-stripe-event";

export const runtime = "nodejs";

/**
 * Stripe webhook endpoint.
 *
 * Signatures are verified against the exact raw bytes Stripe sent. Only then is
 * the event handed to the transactional processor; a verification failure
 * never reaches payment or stock logic. Processing failures return 500 so
 * Stripe retries, while replayed events are accepted as successful no-ops.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      getServerEnv().STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid stripe-signature header" },
      { status: 400 },
    );
  }

  try {
    await processStripeEvent(event);
  } catch (error) {
    console.error("STRIPE_WEBHOOK_ERROR", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
