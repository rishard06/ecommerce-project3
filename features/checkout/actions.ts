"use server";

import { z } from "zod";
import { CartQuoteError } from "@/features/cart/server/quote-cart";
import { requireUser, UnauthorizedError } from "@/features/identity/server/guards";
import {
  createPendingOrder,
  createPendingOrderInputSchema,
  InsufficientStockError,
} from "./server/create-pending-order";
import type {
  CreateOrderActionInput,
  CreateOrderActionResult,
} from "./types";

/**
 * Browser-submitted checkout fields. `userId` is intentionally absent: it is
 * always taken from the authenticated session.
 */
const checkoutInputSchema = createPendingOrderInputSchema.omit({ userId: true });

export async function createOrderAction(
  input: CreateOrderActionInput,
): Promise<CreateOrderActionResult> {
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

    return { success: true, orderId };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: "Unauthorized" };
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
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}
