import { prisma } from "@/lib/prisma";
import {
  PRODUCT_INCLUDE,
  toSummary,
  type StorefrontProductSummary,
} from "@/features/catalog/server/catalog-view";

export type SearchSort = "price-asc" | "price-desc" | "newest";

export interface SearchParams {
  q?: string;
  sort?: SearchSort;
  category?: string;
  skip?: number;
  limit?: number;
}

interface SearchResult {
  products: StorefrontProductSummary[];
  total: number;
}

/**
 * Searches the owned, active catalog. Only ACTIVE products with at least one
 * variant are sellable, so those are the only rows returned. Money is integer
 * cents end to end.
 */
export async function searchProducts({
  q,
  sort,
  category,
  skip = 0,
  limit = 20,
}: SearchParams): Promise<SearchResult> {
  const where = {
    status: "ACTIVE" as const,
    variants: { some: {} },
    ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
    ...(category ? { category: { slug: category } } : {}),
  };

  try {
    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: PRODUCT_INCLUDE,
        orderBy: [{ slug: "asc" }],
      }),
      prisma.product.count({ where }),
    ]);

    const orderedRows = [...rows].sort((a, b) => {
      if (sort === "newest") {
        return b.createdAt.getTime() - a.createdAt.getTime();
      }
      if (sort === "price-asc" || sort === "price-desc") {
        const priceOf = (row: (typeof rows)[number]) =>
          (row.variants.find((variant) => variant.isDefault) ?? row.variants[0])
            ?.priceCents ?? 0;
        const delta = priceOf(a) - priceOf(b);
        return sort === "price-asc" ? delta : -delta;
      }
      return a.slug.localeCompare(b.slug);
    });

    const products = orderedRows
      .map(toSummary)
      .filter(
        (product): product is StorefrontProductSummary => product !== null,
      )
      .slice(skip, skip + limit);

    return { products, total };
  } catch {
    return { products: [], total: 0 };
  }
}
