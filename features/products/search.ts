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
  /**
   * Opaque forward cursor: base64url of the last slug on the previous page.
   * Omitted (the default) keeps the existing skip/offset paging.
   */
  cursor?: string;
  /**
   * Related-products mode: keep only products sharing the category of this
   * slug, and exclude the slug itself. Resolved in the same query so callers
   * never have to read the product's category first.
   */
  relatedTo?: string;
}

/** Cursor payloads are versioned so a raw offset can never be mistaken for one. */
const CURSOR_VERSION = "v1";
const MAX_CURSOR_LENGTH = 256;
const MAX_SLUG_LENGTH = 200;
/** Slugs are ASCII words (kebab-case in practice); anything else is forged. */
const CURSOR_SLUG_PATTERN = /^[A-Za-z0-9._-]+$/;

/** Encodes the last-seen product slug as an opaque cursor; never a raw offset. */
export function encodeCursor(slug: string): string {
  return Buffer.from(`${CURSOR_VERSION}:${slug}`, "utf8").toString(
    "base64url",
  );
}

/** Decodes a cursor back to its slug, or null when it is invalid/forged. */
export function decodeCursor(cursor?: string | null): string | null {
  if (!cursor || cursor.length > MAX_CURSOR_LENGTH) return null;

  let decoded: string;
  try {
    decoded = Buffer.from(cursor, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const prefix = `${CURSOR_VERSION}:`;
  if (!decoded.startsWith(prefix)) return null;

  const slug = decoded.slice(prefix.length);
  if (slug.length === 0 || slug.length > MAX_SLUG_LENGTH) return null;
  if (!CURSOR_SLUG_PATTERN.test(slug)) return null;

  return slug;
}

/**
 * Guarded rollout: keyset paging is opt-in via `PRODUCTS_CURSOR_PAGINATION=1`.
 * Unset/false keeps `skip` as the only advertised paging mode, so existing
 * links and bookmarks behave exactly as before.
 */
export function isCursorPaginationEnabled(): boolean {
  const value = process.env.PRODUCTS_CURSOR_PAGINATION?.toLowerCase();
  return value === "1" || value === "true";
}

/**
 * A cursor only has a defined position when the rows are totally ordered by
 * slug. Rating/newest/price sorts keep offset paging (their cursor position
 * cannot be derived from a slug alone).
 */
export function supportsCursorPaging(sort: SearchSort | undefined): boolean {
  return sort === undefined || sort === "relevance";
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
 * Escapes LIKE metacharacters so shopper input is matched literally.
 * PostgreSQL's default LIKE escape character is `\`, so the backslash itself
 * is escaped in the same single pass (`\` -> `\\`, `%` -> `\%`, `_` -> `\_`).
 * The result is still passed as a bound parameter on both query paths; this
 * only changes the pattern, never how it is sent.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

/**
 * The same predicate is used for the rows query and the `count`, so `total`
 * always describes the full result set rather than the returned page.
 */
function buildWhere(
  q?: string,
  category?: string,
  relatedTo?: string,
): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [];

  if (category) {
    and.push({ category: { slug: category } });
  }
  if (relatedTo) {
    // Same category as the subject product, resolved from the slug so this can
    // run in parallel with the detail read. The subject is never "related".
    and.push({ category: { products: { some: { slug: relatedTo } } } });
    and.push({ slug: { not: relatedTo } });
  }
  if (q) {
    const term = escapeLikePattern(q);
    and.push({
      OR: [
        { title: { contains: term, mode: "insensitive" } },
        { slug: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { brand: { contains: term, mode: "insensitive" } },
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
  relatedTo,
  skip,
  take,
  sort,
}: {
  q?: string;
  category?: string;
  relatedTo?: string;
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
  if (relatedTo) {
    // Mirrors the Prisma path in buildWhere: same category as the subject,
    // subject excluded.
    filters.push(Prisma.sql`p."slug" <> ${relatedTo}`);
    filters.push(
      Prisma.sql`EXISTS (
        SELECT 1
        FROM "product" related
        WHERE related."categoryId" = p."categoryId"
          AND related."slug" = ${relatedTo}
      )`,
    );
  }
  if (q) {
    const pattern = `%${escapeLikePattern(q)}%`;
    filters.push(
      Prisma.sql`(p."title" ILIKE ${pattern}
        OR p."slug" ILIKE ${pattern}
        OR p."description" ILIKE ${pattern}
        OR p."brand" ILIKE ${pattern})`,
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
 *
 * `skip` is the default (and fallback) paging mode. When a valid `cursor` is
 * supplied on a slug-ordered sort, the page resumes after that slug instead,
 * so concurrent inserts cannot shift the window.
 */
export async function searchProducts({
  q,
  sort,
  category,
  skip = 0,
  limit = 20,
  cursor,
  relatedTo,
}: SearchParams): Promise<SearchResult> {
  const query = q?.trim() || undefined;
  const where = buildWhere(query, category, relatedTo);
  const { skip: pageSkip, take: pageTake } = normalizePaging(skip, limit);
  const totalQuery = prisma.product.count({ where });

  // Guarded: a cursor is honoured only when a slug position is meaningful.
  // Invalid/stale cursors (and every non-slug sort) fall through to the
  // untouched offset path below, so old `skip` URLs never break.
  const cursorSlug = supportsCursorPaging(sort) ? decodeCursor(cursor) : null;

  if (cursorSlug) {
    // Resume strictly after the last slug the shopper saw: rows inserted
    // behind the cursor cannot repeat a product already on screen. `total`
    // still counts the whole filtered set, so the page counter is unchanged.
    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where: { ...where, slug: { gt: cursorSlug } },
        include: PRODUCT_INCLUDE,
        orderBy: orderByFor(sort),
        take: pageTake,
      }),
      totalQuery,
    ]);

    return { products: dropUnsellable(rows), total };
  }

  if (isPriceSort(sort)) {
    const [idRows, total] = await Promise.all([
      prisma.$queryRaw<{ id: string }[]>(
        priceOrderedIdsQuery({
          q: query,
          category,
          relatedTo,
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
