import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveProductsBySlugs } from "@/features/catalog/server/storefront-service";

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

/**
 * Card-minimal product data for a wishlisted slug: exactly what
 * `ProductCard` needs (title, price, image plus its identifiers), nothing
 * more.
 */
export interface WishlistCard {
  productSlug: string;
  variantId: string;
  title: string;
  priceCents: number;
  image: string;
  description: string;
}

/**
 * Hydrates wishlist slugs into cards, in wishlist order. Slugs must already
 * be the caller's own rows — pass the just-fetched `getWishlist(userId)`
 * result, or omit `ownedSlugs` to re-derive them here (standalone use).
 * Hydration has no ownership predicate of its own, so never pass
 * client-supplied slugs. Archived/unknown/unsellable slugs are skipped so the
 * favorites page never renders a dead card.
 */
export async function getWishlistCards(
  userId: string,
  ownedSlugs?: string[],
): Promise<WishlistCard[]> {
  const slugs = ownedSlugs ?? (await getWishlist(userId));
  if (slugs.length === 0) return [];

  const products = await getActiveProductsBySlugs(slugs);
  return products.map((product) => ({
    productSlug: product.slug,
    variantId: product.defaultVariantId,
    title: product.title,
    priceCents: product.priceCents,
    image: product.image,
    description: product.description,
  }));
}

/**
 * Deletes every wishlist row for a product slug, across all users. This is an
 * admin cleanup path (called when a product is archived): archived products
 * stay readable for order history but can never render again, so their hearts
 * would otherwise dangle forever. All user-facing reads above stay
 * `userId`-scoped; this is the only cross-user write and it never runs with
 * user-supplied input — only with the archived product's own slug.
 */
export async function deleteWishlistEntriesForSlug(
  productSlug: string,
): Promise<void> {
  await prisma.wishlistItem.deleteMany({ where: { productSlug } });
}
