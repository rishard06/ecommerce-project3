"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { CartQuoteError, quoteCart } from "@/features/cart/server/quote-cart";
import type { CartItemInput } from "@/features/cart/types";
import { CouponError } from "@/features/coupons/server/coupon-service";
import {
  ForbiddenError,
  getCurrentUser,
  UnauthorizedError,
} from "@/features/identity/server/guards";
import {
  CheckoutSessionError,
  createCheckoutSession,
} from "@/features/payments/server/create-checkout-session";
import {
  createPendingOrder,
  createPendingOrderBaseSchema,
  checkGuestEmailOptIn,
  guestEmailOptInRefinement,
  InsufficientStockError,
} from "./server/create-pending-order";
import type {
  CreateOrderActionInput,
  QuoteCheckoutActionResult,
  StartCheckoutActionResult,
} from "./types";

/**
 * Browser-submitted checkout fields. Identity is never accepted from the
 * client: authenticated users come from the session, guests get a fresh
 * server-generated token.
 */
const checkoutInputSchema = createPendingOrderBaseSchema
  .omit({
    userId: true,
    guestToken: true,
  })
  .refine(checkGuestEmailOptIn, guestEmailOptInRefinement);

/**
 * Prices the cart for the review step. Only `{ variantId, quantity }` is
 * accepted; titles, unit prices, and totals are always rebuilt from the
 * database catalog. This is a read, so no order or reservation is written.
 */
export async function quoteCheckoutAction(
  items: CartItemInput[],
  couponCode?: string,
): Promise<QuoteCheckoutActionResult> {
  try {
    const quote = couponCode?.trim()
      ? await quoteCart(items, undefined, {
          couponCode,
          strictCoupon: true,
        })
      : await quoteCart(items);
    return { success: true, quote };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message ?? "Invalid cart",
      };
    }
    if (error instanceof CartQuoteError) {
      return { success: false, error: error.message };
    }
    // Invalid/expired/exhausted coupons carry safe user-facing messages.
    if (error instanceof CouponError) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: "Unable to confirm current prices. Please try again.",
    };
  }
}

/**
 * Creates a pending order and immediately starts a hosted Stripe Checkout
 * session for it. Authenticated identity comes from the session; guests get a
 * server-generated token. Prices come only from the server-side cart quote.
 * The returned URL is a redirect target, not proof of payment.
 */
export async function startCheckoutAction(
  input: CreateOrderActionInput,
): Promise<StartCheckoutActionResult> {
  try {
    // Authenticated path wins; guests fall through with a fresh token.
    const user = await getCurrentUser();

    const { items, shipping, idempotencyKey, couponCode, guestEmail, guestEmailOptIn } =
      checkoutInputSchema.parse(input);

    const guestToken = user ? undefined : randomUUID();

    const { orderId } = await createPendingOrder({
      userId: user?.id,
      guestToken,
      items,
      shipping,
      idempotencyKey,
      couponCode,
      // Guests only: the write boundary persists this solely on guest orders
      // with the flag set; signed-in orders always use the account email.
      guestEmail,
      guestEmailOptIn,
    });

    const { url } = await createCheckoutSession(orderId);

    return { success: true, url, orderId, ...(guestToken ? { guestToken } : {}) };
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
    if (error instanceof CouponError) {
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
