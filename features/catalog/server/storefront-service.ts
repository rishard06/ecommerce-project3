/**
 * Storefront reads over the owned PostgreSQL catalog.
 *
 * Every query is scoped to `status: ACTIVE` products that have at least one
 * variant (a product without a variant cannot be purchased, so it never
 * reaches the storefront), with deterministic ordering so pagination is
 * stable. All money is integer cents (USD).
 */

import { prisma } from "@/lib/prisma";
import {
  PRODUCT_DETAIL_INCLUDE,
  PRODUCT_INCLUDE,
  toDetail,
  toSummary,
  type CatalogProductDetailRow,
  type StorefrontProduct,
  type StorefrontProductSummary,
} from "./catalog-view";

/** One page of active products plus paging metadata. */
export interface ProductPage {
  products: StorefrontProductSummary[];
  total: number;
  skip: number;
  take: number;
}

const ACTIVE_WITH_VARIANT = {
  status: "ACTIVE" as const,
  // A product with no variant is not sellable; exclude it from the storefront.
  variants: { some: {} },
};

function dropUnsellable(
  summaries: (StorefrontProductSummary | null)[],
): StorefrontProductSummary[] {
  return summaries.filter((summary): summary is StorefrontProductSummary => summary !== null);
}

/**
 * Active products in deterministic `slug asc` order, optionally filtered by
 * category slug, with `skip`/`take` paging. `total` counts every matching
 * product, not just the returned page.
 */
export async function listActiveProducts(
  categorySlug?: string,
  skip = 0,
  take = 20,
): Promise<ProductPage> {
  const where = categorySlug
    ? { ...ACTIVE_WITH_VARIANT, category: { slug: categorySlug } }
    : ACTIVE_WITH_VARIANT;

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: PRODUCT_INCLUDE,
      orderBy: [{ slug: "asc" }],
      skip,
      take,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products: dropUnsellable(rows.map(toSummary)),
    total,
    skip,
    take,
  };
}

/**
 * A single active product by slug (the URL identity of the detail page), or
 * null when the slug is unknown, not ACTIVE, or the product has no variant.
 */
export async function getActiveProduct(slug: string): Promise<StorefrontProduct | null> {
  const row: CatalogProductDetailRow | null = await prisma.product.findFirst({
    where: { slug, status: "ACTIVE" },
    include: PRODUCT_DETAIL_INCLUDE,
  });

  if (!row) return null;
  return toDetail(row);
}

/**
 * Active, sellable products for an explicit slug list, in the same order as
 * the input slugs. Unknown, non-ACTIVE, or variant-less slugs are skipped —
 * callers (wishlist hydration) must never render a dead card.
 */
export async function getActiveProductsBySlugs(
  slugs: string[],
): Promise<StorefrontProductSummary[]> {
  if (slugs.length === 0) return [];

  const rows = await prisma.product.findMany({
    where: { slug: { in: slugs }, ...ACTIVE_WITH_VARIANT },
    include: PRODUCT_INCLUDE,
  });

  const bySlug = new Map(
    dropUnsellable(rows.map(toSummary)).map((product) => [product.slug, product]),
  );
  return slugs.flatMap((slug) => {
    const product = bySlug.get(slug);
    return product ? [product] : [];
  });
}

/**
 * Highest-rated active products, deterministically ordered by rating desc
 * then slug asc.
 */
export async function getFeatureProducts(limit = 4): Promise<StorefrontProductSummary[]> {
  const rows = await prisma.product.findMany({
    where: ACTIVE_WITH_VARIANT,
    include: PRODUCT_INCLUDE,
    orderBy: [{ rating: "desc" }, { slug: "asc" }],
    take: limit,
  });

  return dropUnsellable(rows.map(toSummary));
}
