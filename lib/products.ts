/**
 * Storefront catalog compatibility adapter.
 *
 * The storefront used to read DummyJSON at runtime; these helpers now proxy
 * the owned PostgreSQL catalog (see `features/catalog/server/storefront-service`).
 * DummyJSON remains seed input only. All money is integer cents (USD).
 */

import { cacheLife, cacheTag } from "next/cache";
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
export async function getProduct(slug: string): Promise<StorefrontProduct | null> {
  "use cache";
  cacheLife({ stale: 60, revalidate: PRODUCT_DETAIL_REVALIDATE_SECONDS, expire: 300 });
  cacheTag(PRODUCTS_CACHE_TAG);
  return getActiveProduct(slug);
}

/**
 * Related cards for a detail page: other products in the same category,
 * resolved in one query from the slug alone so the read can start in parallel
 * with `getProduct` instead of waiting for the detail to resolve. Cached under
 * the same tag/window as the detail read.
 *
 * Same return shape as `getProducts`; transparently cached.
 */
export async function getRelatedProducts(
  slug: string,
  limit = 5,
): Promise<ProductResponse> {
  "use cache";
  cacheLife({ stale: 60, revalidate: PRODUCT_DETAIL_REVALIDATE_SECONDS, expire: 300 });
  cacheTag(PRODUCTS_CACHE_TAG);
  return getProducts(undefined, 0, limit, { relatedTo: slug });
}

/**
 * Highest-rated active products for the storefront feature section (4) and
 * the landing carousel (8). `limit` defaults to the feature-section size.
 */
export async function getFeatureProducts(
  limit = 4,
): Promise<StorefrontProductSummary[]> {
  return queryFeatureProducts(limit);
}
