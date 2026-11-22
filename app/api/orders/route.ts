import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, clientIpFromHeaders } from "@/lib/rate-limit";
import { CartQuoteError } from "@/features/cart/server/quote-cart";
import { CouponError } from "@/features/coupons/server/coupon-service";
import {
  ForbiddenError,
  requireUser,
  UnauthorizedError,
} from "@/features/identity/server/guards";
import {
  createPendingOrder,
  createPendingOrderBaseSchema,
  checkGuestEmailOptIn,
  guestEmailOptInRefinement,
  InsufficientStockError,
} from "@/features/checkout/server/create-pending-order";

/**
 * Legacy JSON checkout entry point. It shares the transactional order service
 * with the server action so every order path creates stock reservations.
 */
const checkoutInputSchema = createPendingOrderBaseSchema
  .omit({
    userId: true,
    guestToken: true,
  })
  .refine(checkGuestEmailOptIn, guestEmailOptInRefinement);

export async function POST(req: Request) {
  const ip = clientIpFromHeaders(req.headers);
  const limit = checkRateLimit(`orders:${ip}`, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests", code: "RATE_LIMITED" },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfter) },
      },
    );
  }

  try {
    // SECURITY: ownership comes from the session, never from the request body.
    // Guests use startCheckoutAction; this legacy endpoint stays authenticated.
    const user = await requireUser();

    const body = await req.json().catch(() => null);
    const { items, shipping, idempotencyKey, couponCode } =
      checkoutInputSchema.parse(body ?? {});

    const { orderId } = await createPendingOrder({
      userId: user.id,
      items,
      shipping,
      idempotencyKey,
      couponCode,
    });

    return NextResponse.json({ orderId }, { status: 201 });
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
    if (error instanceof CouponError) {
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
