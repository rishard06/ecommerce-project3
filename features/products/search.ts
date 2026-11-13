import { Prisma } from "@/app/generated/prisma";
import { prisma } from "@/lib/prisma";
import {
  PRODUCT_INCLUDE,
  toSummary,
  type CatalogProductRow,
  type StorefrontProductSummary,
} from "@/features/catalog/server/catalog-view";

export type SearchSort =
  | "relevance"
  | "newest"
  | "rating"
  | "price-asc"
  | "price-desc";

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

/** Narrows an untrusted `sort` query-string value to a supported sort. */
export function isSearchSort(value: string | undefined): value is SearchSort {
  return (
    value === "relevance" ||
    value === "newest" ||
    value === "rating" ||
    value === "price-asc" ||
    value === "price-desc"
  );
}

function isPriceSort(
  sort: SearchSort | undefined,
): sort is "price-asc" | "price-desc" {
  return sort === "price-asc" || sort === "price-desc";
}

function normalizePaging(skip: number, limit: number) {
  return {
    skip: Number.isFinite(skip) ? Math.max(0, Math.trunc(skip)) : 0,
    take: Number.isFinite(limit) ? Math.max(0, Math.trunc(limit)) : 20,
  };
}

/**
 * The same predicate is used for the rows query and the `count`, so `total`
 * always describes the full result set rather than the returned page.
 */
function buildWhere(q?: string, category?: string): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [];

  if (category) {
    and.push({ category: { slug: category } });
  }
  if (q) {
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  return {
    status: "ACTIVE",
    // A product with no variant cannot be purchased, so it is not listed.
    variants: { some: {} },
    ...(and.length > 0 ? { AND: and } : {}),
  };
}

/**
 * Price is not a scalar column on Product, so `orderBy` cannot reference the
 * default variant's cents. Prisma's relation ordering only exposes `_count`
 * for to-many relations, and denormalizing a price column would need a schema
 * migration outside this fix. Instead the page's product ids are selected by
 * an SQL join in the database, then hydrated through the normal Prisma include.
 * The lateral join mirrors `defaultVariantOf` in catalog-view: prefer the
 * flagged default variant, falling back to the lowest-id variant.
 */
function priceOrderedIdsQuery({
  q,
  category,
  skip,
  take,
  sort,
}: {
  q?: string;
  category?: string;
  skip: number;
  take: number;
  sort: "price-asc" | "price-desc";
}): Prisma.Sql {
  const filters: Prisma.Sql[] = [
    Prisma.sql`p."status" = 'ACTIVE'`,
    Prisma.sql`EXISTS (
      SELECT 1
      FROM "product_variant" sellable
      WHERE sellable."productId" = p."id"
    )`,
  ];

  if (category) {
    filters.push(Prisma.sql`c."slug" = ${category}`);
  }
  if (q) {
    const pattern = `%${q}%`;
    filters.push(
      Prisma.sql`(p."title" ILIKE ${pattern} OR p."slug" ILIKE ${pattern})`,
    );
  }

  return Prisma.sql`
    SELECT p."id"
    FROM "product" p
    JOIN "category" c ON c."id" = p."categoryId"
    JOIN LATERAL (
      SELECT v."priceCents"
      FROM "product_variant" v
      WHERE v."productId" = p."id"
      ORDER BY v."isDefault" DESC, v."id" ASC
      LIMIT 1
    ) dv ON TRUE
    WHERE ${Prisma.join(filters, " AND ")}
    ORDER BY dv."priceCents" ${sort === "price-asc" ? Prisma.raw("ASC") : Prisma.raw("DESC")}, p."slug" ASC
    LIMIT ${take}
    OFFSET ${skip}
  `;
}

function orderByFor(
  sort: SearchSort | undefined,
): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "rating":
      return [{ rating: "desc" }, { slug: "asc" }];
    case "newest":
      return [{ createdAt: "desc" }, { slug: "asc" }];
    case "relevance":
    default:
      return [{ slug: "asc" }];
  }
}

function dropUnsellable(
  rows: CatalogProductRow[],
): StorefrontProductSummary[] {
  return rows
    .map(toSummary)
    .filter((product): product is StorefrontProductSummary => product !== null);
}

/**
 * Searches the owned, active catalog. Only ACTIVE products with at least one
 * variant are sellable, so those are the only rows returned. Money is integer
 * cents end to end.
 *
 * Paging and ordering happen in the database; errors are allowed to propagate
 * so a database failure is never mistaken for an empty catalog.
 */
export async function searchProducts({
  q,
  sort,
  category,
  skip = 0,
  limit = 20,
}: SearchParams): Promise<SearchResult> {
  const query = q?.trim() || undefined;
  const where = buildWhere(query, category);
  const { skip: pageSkip, take: pageTake } = normalizePaging(skip, limit);
  const totalQuery = prisma.product.count({ where });

  if (isPriceSort(sort)) {
    const [idRows, total] = await Promise.all([
      prisma.$queryRaw<{ id: string }[]>(
        priceOrderedIdsQuery({
          q: query,
          category,
          skip: pageSkip,
          take: pageTake,
          sort,
        }),
      ),
      totalQuery,
    ]);

    if (idRows.length === 0) {
      return { products: [], total };
    }

    // Hydrate only the page's ids, then restore the database order.
    const rows = await prisma.product.findMany({
      where: { id: { in: idRows.map((row) => row.id) } },
      include: PRODUCT_INCLUDE,
    });
    const rowById = new Map(rows.map((row) => [row.id, row]));
    const pageRows = idRows
      .map((row) => rowById.get(row.id))
      .filter((row): row is CatalogProductRow => row !== undefined);

    return { products: dropUnsellable(pageRows), total };
  }

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: PRODUCT_INCLUDE,
      orderBy: orderByFor(sort),
      skip: pageSkip,
      take: pageTake,
    }),
    totalQuery,
  ]);

  return { products: dropUnsellable(rows), total };
}
