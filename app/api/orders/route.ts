import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { CartQuoteError } from "@/features/cart/server/quote-cart";
import {
  ForbiddenError,
  getCurrentUser,
  UnauthorizedError,
} from "@/features/identity/server/guards";
import {
  createPendingOrder,
  createPendingOrderBaseSchema,
  InsufficientStockError,
} from "@/features/checkout/server/create-pending-order";

/**
 * Legacy JSON checkout entry point. It shares the transactional order service
 * with the server action so every order path creates stock reservations.
 */
const checkoutInputSchema = createPendingOrderBaseSchema.omit({
  userId: true,
  guestToken: true,
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    const body = await req.json().catch(() => null);
    const { items, shipping, idempotencyKey } = checkoutInputSchema.parse(
      body ?? {},
    );

    const guestToken = user ? undefined : randomUUID();

    const { orderId } = await createPendingOrder({
      userId: user?.id,
      guestToken,
      items,
      shipping,
      idempotencyKey,
    });

    return NextResponse.json(
      { orderId, ...(guestToken ? { guestToken } : {}) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (error instanceof CartQuoteError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof InsufficientStockError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }
    console.error("ORDER_CREATION_ERROR", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
