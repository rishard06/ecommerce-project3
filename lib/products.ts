/**
 * Storefront catalog compatibility adapter.
 *
 * The storefront used to read DummyJSON at runtime; these helpers now proxy
 * the owned PostgreSQL catalog (see `features/catalog/server/storefront-service`).
 * DummyJSON remains seed input only. All money is integer cents (USD).
 */

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { PRODUCTS_CACHE_TAG } from "@/lib/cache-tags";
import {
  getActiveProduct,
  getFeatureProducts as queryFeatureProducts,
  type ProductPage,
} from "@/features/catalog/server/storefront-service";
import {
  searchProducts,
  type SearchSort,
} from "@/features/products/search";
import type {
  StorefrontProduct,
  StorefrontProductSummary,
} from "@/features/catalog/server/catalog-view";

/** Repeat product-detail views are served from the data cache this long. */
const PRODUCT_DETAIL_REVALIDATE_SECONDS = 60;

export interface Category {
  slug: string;
  name: string;
}

export type ProductResponse = ProductPage;

export interface ProductListingOptions {
  q?: string;
  sort?: SearchSort;
  /** Opaque forward cursor; omit for the default skip/offset paging. */
  cursor?: string;
  /**
   * Restricts the listing to the category of this product slug and excludes
   * the product itself (the detail page's "related" rail).
   */
  relatedTo?: string;
}

/**
 * Active catalog categories ordered by name.
 */
export async function getCategories(): Promise<Category[]> {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { slug: true, name: true },
  });
}

/**
 * Active products with optional category, full-text query, sort, and paging.
 * Search/paging/sort execute in the database; `total` counts every matching
 * product, not just the returned page.
 */
export async function getProducts(
  category?: string,
  skip: number = 0,
  limit: number = 20,
  options: ProductListingOptions = {}
): Promise<ProductResponse> {
  const { products, total } = await searchProducts({
    q: options.q,
    sort: options.sort,
    category,
    skip,
    limit,
    cursor: options.cursor,
    relatedTo: options.relatedTo,
  });

  return { products, total, skip, take: limit };
}

/**
 * Cached detail read. The slug is part of the cache key, entries expire after
 * 60 seconds, and every entry carries the shared products tag so an admin edit
 * can drop it immediately instead of serving a stale price.
 */
const getCachedProduct = unstable_cache(
  async (slug: string) => getActiveProduct(slug),
  ["storefront-product-detail"],
  {
    revalidate: PRODUCT_DETAIL_REVALIDATE_SECONDS,
    tags: [PRODUCTS_CACHE_TAG],
  },
);

/**
 * A single active product by slug, or null when it is missing, not ACTIVE,
 * or has no variant. Transparently cached — callers see the same shape.
 */
export async function getProduct(slug: string): Promise<StorefrontProduct | null> {
  return getCachedProduct(slug);
}

/**
 * Related cards for a detail page: other products in the same category,
 * resolved in one query from the slug alone so the read can start in parallel
 * with `getProduct` instead of waiting for the detail to resolve. Cached under
 * the same tag/window as the detail read.
 */
const getCachedRelatedProducts = unstable_cache(
  async (slug: string, limit: number) =>
    getProducts(undefined, 0, limit, { relatedTo: slug }),
  ["storefront-product-related"],
  {
    revalidate: PRODUCT_DETAIL_REVALIDATE_SECONDS,
    tags: [PRODUCTS_CACHE_TAG],
  },
);

/** Same return shape as `getProducts`; transparently cached. */
export async function getRelatedProducts(
  slug: string,
  limit = 5,
): Promise<ProductResponse> {
  return getCachedRelatedProducts(slug, limit);
}

/**
 * Highest-rated active products for the storefront feature section.
 */
export async function getFeatureProducts(): Promise<StorefrontProductSummary[]> {
  return queryFeatureProducts(4);
}
