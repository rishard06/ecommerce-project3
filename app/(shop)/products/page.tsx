import React from "react";
import Link from "next/link";
import ProductCard from "@/features/products/components/ProductCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getCategories, getProducts } from "@/lib/products";
import {
  decodeCursor,
  encodeCursor,
  isCursorPaginationEnabled,
  isSearchSort,
  supportsCursorPaging,
} from "@/features/products/search";
import { CategorySidebar } from "@/features/products/components/CategorySidebar";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    skip?: string;
    q?: string;
    sort?: string;
    cursor?: string;
  }>;
}) {
  const params = await searchParams;
  const currentCategory = params.category;
  const q = params.q?.trim() || undefined;
  const sort = isSearchSort(params.sort) ? params.sort : undefined;
  const requestedSkip = Number.parseInt(params.skip ?? "0", 10);
  // A malformed skip must not produce NaN hrefs; paging falls back to page 1.
  const skip = Number.isFinite(requestedSkip) ? Math.max(0, requestedSkip) : 0;
  const limit = 20;

  // Guarded rollout: `skip` is the default paging mode. A cursor is only
  // trusted while the flag is on, only decodes to a slug, and only applies to
  // the slug-ordered sorts — anything else is ignored, so legacy links work.
  const cursorEnabled = isCursorPaginationEnabled();
  const cursor =
    cursorEnabled && supportsCursorPaging(sort) && decodeCursor(params.cursor)
      ? params.cursor
      : undefined;

  const buildHref = (nextSkip: number, nextCursor?: string) => {
    const query = new URLSearchParams();
    if (currentCategory) query.set("category", currentCategory);
    if (q) query.set("q", q);
    if (sort) query.set("sort", sort);
    // `skip` stays on cursor hrefs: it keeps the page counter and the
    // offset fallback correct, while the server prefers the cursor.
    query.set("skip", String(Math.max(0, nextSkip)));
    if (nextCursor) query.set("cursor", nextCursor);
    return `/products?${query.toString()}`;
  };

  try {
    const [categories, productData] = await Promise.all([
      getCategories(),
      getProducts(currentCategory, skip, limit, { q, sort, cursor }),
    ]);

    const { products, total } = productData;
    const hasPrevious = skip > 0;
    const hasNext = skip + limit < total;
    const lastProduct = products[products.length - 1];
    // Next is the only forward hop, so it is the only link that carries a
    // cursor. "Previous" keeps the offset link (a cursor is forward-only, and
    // the products behind it are already known).
    const nextCursor =
      cursorEnabled && supportsCursorPaging(sort) && lastProduct
        ? encodeCursor(lastProduct.slug)
        : undefined;

    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col justify-center gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:gap-8 lg:px-8">
        <CategorySidebar categories={categories} currentCategory={currentCategory} />

        {/* Products content */}
        <div className="glass-component flex w-full flex-col p-5 sm:p-6 lg:w-3/4 md:p-8">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
            <h1 className="text-2xl font-semibold capitalize tracking-tight text-gray-primary md:text-3xl">
              {q
                ? `Results for "${q}"`
                : currentCategory
                  ? currentCategory.replace(/-/g, " ")
                  : "All products"}
            </h1>
            <p className="text-sm font-medium text-gray-tertiary" aria-live="polite">
              Showing {Math.min(skip + 1, total)}–{Math.min(skip + products.length, total)} of{" "}
              {total}
            </p>
          </div>

          {products.length > 0 ? (
            <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard
                  key={product.slug}
                  slug={product.slug}
                  variantId={product.defaultVariantId}
                  title={product.title}
                  priceCents={product.priceCents}
                  image={product.image}
                  description={product.description}
                  isPopular={product.isPopular}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
              <p className="text-lg font-medium text-gray-secondary">
                {q
                  ? `No products found for "${q}".`
                  : "No products in this category yet."}
              </p>
              <Link
                href="/products"
                className="mt-3 rounded-full px-2 py-1 text-sm font-semibold text-accent-text hover:underline"
              >
                View all products
              </Link>
            </div>
          )}

          <nav
            aria-label="Pagination"
            className="mt-auto flex items-center justify-center gap-3 pt-2"
          >
            {hasPrevious ? (
              <Link
                href={buildHref(skip - limit)}
                className="flex items-center gap-1.5 rounded-full bg-white/70 px-5 py-2.5 text-sm font-semibold text-gray-secondary shadow-soft transition-colors hover:bg-white hover:text-gray-primary"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
                Previous
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="flex cursor-not-allowed items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-gray-quaternary/70"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
                Previous
              </span>
            )}

            <div className="min-w-24 text-center text-sm font-semibold tabular-nums text-gray-tertiary">
              Page {Math.floor(skip / limit) + 1}
            </div>

            {hasNext ? (
              <Link
                href={buildHref(skip + limit, nextCursor)}
                className="flex items-center gap-1.5 rounded-full bg-white/70 px-5 py-2.5 text-sm font-semibold text-gray-secondary shadow-soft transition-colors hover:bg-white hover:text-gray-primary"
              >
                Next
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="flex cursor-not-allowed items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-gray-quaternary/70"
              >
                Next
                <ChevronRight className="size-4" aria-hidden="true" />
              </span>
            )}
          </nav>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error loading products:", error);
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-3 text-2xl font-semibold text-gray-primary">
          Something went wrong
        </h1>
        <p className="mb-6 text-gray-secondary">
          We couldn&apos;t load the products right now.
        </p>
        <Link
          href="/products"
          className="rounded-full bg-action px-6 py-3 font-semibold text-action-foreground transition-colors hover:bg-action-hover"
        >
          Try again
        </Link>
      </div>
    );
  }
}
