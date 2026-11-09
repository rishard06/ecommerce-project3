import Stripe from "stripe";
import { getServerEnv } from "@/lib/env";

/**
 * Lazily constructed Stripe client.
 *
 * The secret key is read from validated server environment only when a
 * checkout session is actually created. Importing this module performs no
 * environment access, so it is safe to load during builds and tests.
 */
let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(getServerEnv().STRIPE_SECRET_KEY);
  }

  return stripeClient;
}
