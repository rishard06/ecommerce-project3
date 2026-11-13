/**
 * Storefront catalog compatibility adapter.
 *
 * The storefront used to read DummyJSON at runtime; these helpers now proxy
 * the owned PostgreSQL catalog (see `features/catalog/server/storefront-service`).
 * DummyJSON remains seed input only. All money is integer cents (USD).
 */

import { prisma } from "@/lib/prisma";
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

export interface Category {
  slug: string;
  name: string;
}

export type ProductResponse = ProductPage;

export interface ProductListingOptions {
  q?: string;
  sort?: SearchSort;
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
  });

  return { products, total, skip, take: limit };
}

/**
 * A single active product by slug, or null when it is missing, not ACTIVE,
 * or has no variant.
 */
export async function getProduct(slug: string): Promise<StorefrontProduct | null> {
  return getActiveProduct(slug);
}

/**
 * Highest-rated active products for the storefront feature section.
 */
export async function getFeatureProducts(): Promise<StorefrontProductSummary[]> {
  return queryFeatureProducts(4);
}
