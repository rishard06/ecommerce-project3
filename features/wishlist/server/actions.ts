import { z } from "zod";
import { prisma } from "@/lib/prisma";

/**
 * Wishlist slugs are short product identifiers (`dummy-<id>` in the owned
 * catalog). Guests never reach this module: the route rejects anonymous
 * callers with 401, and the store only calls it with a session.
 */
export const wishlistSlugSchema = z.string().min(1).max(128);

/**
 * Lists the user's wishlisted slugs in the order they were added. Every
 * predicate includes `userId`, so one user can never read another's list.
 */
export async function getWishlist(userId: string): Promise<string[]> {
  const rows = await prisma.wishlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { productSlug: true },
  });
  return rows.map((row) => row.productSlug);
}

/**
 * Adds (`wished: true`, idempotent upsert on the
 * `@@unique([userId, productSlug])` key) or removes (`wished: false`, a
 * `deleteMany` scoped to the user so another user's row is never touched) a
 * slug, then returns the updated list.
 */
export async function setWishlisted(
  userId: string,
  slug: string,
  wished: boolean,
): Promise<string[]> {
  const productSlug = wishlistSlugSchema.parse(slug);

  if (wished) {
    await prisma.wishlistItem.upsert({
      where: { userId_productSlug: { userId, productSlug } },
      create: { userId, productSlug },
      update: {},
    });
  } else {
    await prisma.wishlistItem.deleteMany({
      where: { userId, productSlug },
    });
  }

  return getWishlist(userId);
}
