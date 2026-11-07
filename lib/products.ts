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
  listActiveProducts,
  type ProductPage,
} from "@/features/catalog/server/storefront-service";
import type {
  StorefrontProduct,
  StorefrontProductSummary,
} from "@/features/catalog/server/catalog-view";

export interface Category {
  slug: string;
  name: string;
}

export type ProductResponse = ProductPage;

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
 * Active products with optional category filtering and pagination.
 */
export async function getProducts(
  category?: string,
  skip: number = 0,
  limit: number = 20
): Promise<ProductResponse> {
  return listActiveProducts(category, skip, limit);
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
