import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireUser,
  UnauthorizedError,
} from "@/features/identity/server/guards";
import {
  getWishlist,
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
    return NextResponse.json({ items: await getWishlist(user.id) });
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
