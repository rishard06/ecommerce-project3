"use server";

import { z } from "zod";
import { CartQuoteError } from "@/features/cart/server/quote-cart";
import {
  ForbiddenError,
  requireUser,
  UnauthorizedError,
} from "@/features/identity/server/guards";
import {
  CheckoutSessionError,
  createCheckoutSession,
} from "@/features/payments/server/create-checkout-session";
import {
  createPendingOrder,
  createPendingOrderInputSchema,
  InsufficientStockError,
} from "./server/create-pending-order";
import type {
  CreateOrderActionInput,
  StartCheckoutActionResult,
} from "./types";

/**
 * Browser-submitted checkout fields. `userId` is intentionally absent: it is
 * always taken from the authenticated session.
 */
const checkoutInputSchema = createPendingOrderInputSchema.omit({ userId: true });

/**
 * Creates a pending order and immediately starts a hosted Stripe Checkout
 * session for it. Identity comes only from the session; prices come only from
 * the server-side cart quote. The returned URL is a redirect target, not proof
 * of payment.
 */
export async function startCheckoutAction(
  input: CreateOrderActionInput,
): Promise<StartCheckoutActionResult> {
  try {
    // SECURITY: ownership comes from the session, never from the payload.
    const user = await requireUser();

    const { items, shipping, idempotencyKey } = checkoutInputSchema.parse(input);

    const { orderId } = await createPendingOrder({
      userId: user.id,
      items,
      shipping,
      idempotencyKey,
    });

    const { url } = await createCheckoutSession(orderId);

    return { success: true, url, orderId };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: "Unauthorized" };
    }
    if (error instanceof ForbiddenError) {
      return { success: false, error: "Forbidden" };
    }
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message ?? "Invalid checkout request",
      };
    }
    if (
      error instanceof CartQuoteError ||
      error instanceof InsufficientStockError
    ) {
      return { success: false, error: error.message };
    }
    if (error instanceof CheckoutSessionError) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}
