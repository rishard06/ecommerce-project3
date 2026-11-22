import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  requireUser,
  UnauthorizedError,
} from "@/features/identity/server/guards";
import {
  getWishlist,
  getWishlistCards,
  setWishlisted,
  wishlistSlugSchema,
} from "@/features/wishlist/server/actions";

/**
 * Thin HTTP surface over the wishlist service. Identity comes only from the
 * session (`requireUser`); the body carries slugs, never a user id. Guests
 * get 401 and keep localStorage-only state — no rows are ever written for
 * them.
 */
const postBodySchema = z.object({
  slug: wishlistSlugSchema,
  wished: z.boolean().optional().default(true),
});

export async function GET() {
  try {
    const user = await requireUser();
    // Cards hydrate other-device slugs (title/price/image) in one round trip.
    // Both reads are scoped to the session user's own rows — one user can
    // never hydrate another's list. The login sync client ignores `cards`.
    const [items, cards] = await Promise.all([
      getWishlist(user.id),
      getWishlistCards(user.id),
    ]);
    return NextResponse.json({ items, cards });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("WISHLIST_GET_ERROR", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();

    // Heart toggling is cheap for humans and scriptable for abuse: cap each
    // user at 100 writes/minute (same 429 + Retry-After shape as orders).
    // Keyed on the user id — not the IP — so one bad actor behind shared NAT
    // can never throttle another user's hearts.
    const limit = checkRateLimit(`wishlist:${user.id}`, 100, 60_000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMITED" },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfter) },
        },
      );
    }
    const body = await req.json().catch(() => null);
    const { slug, wished } = postBodySchema.parse(body ?? {});

    return NextResponse.json({
      items: await setWishlisted(user.id, slug, wished),
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }
    console.error("WISHLIST_POST_ERROR", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
