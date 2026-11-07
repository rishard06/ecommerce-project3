import React from "react";
import Link from "next/link";
import ProductCard from "@/features/products/components/ProductCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getCategories, getProducts } from "@/lib/products";
import { CategorySidebar } from "@/features/products/components/CategorySidebar";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; skip?: string }>;
}) {
  const params = await searchParams;
  const currentCategory = params.category;
  const skip = parseInt(params.skip || "0", 10);
  const limit = 20;

  const buildHref = (nextSkip: number) => {
    const query = new URLSearchParams();
    if (currentCategory) query.set("category", currentCategory);
    query.set("skip", String(Math.max(0, nextSkip)));
    return `/products?${query.toString()}`;
  };

  try {
    const [categories, productData] = await Promise.all([
      getCategories(),
      getProducts(currentCategory, skip, limit),
    ]);

    const { products, total } = productData;
    const hasPrevious = skip > 0;
    const hasNext = skip + limit < total;

    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col justify-center gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:gap-8 lg:px-8">
        <CategorySidebar categories={categories} currentCategory={currentCategory} />

        {/* Products content */}
        <div className="glass-component flex w-full flex-col p-5 sm:p-6 lg:w-3/4 md:p-8">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
            <h1 className="text-2xl font-semibold capitalize tracking-tight text-gray-primary md:text-3xl">
              {currentCategory ? currentCategory.replace(/-/g, " ") : "All products"}
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
                  key={product.id}
                  id={product.id}
                  title={product.title}
                  price={product.price}
                  image={product.thumbnail}
                  description={product.description}
                  isPopular={product.rating > 4.5}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
              <p className="text-lg font-medium text-gray-secondary">
                No products in this category yet.
              </p>
              <Link
                href="/products"
                className="mt-3 rounded-full px-2 py-1 text-sm font-semibold text-accent-700 hover:underline"
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
                href={buildHref(skip + limit)}
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
          className="rounded-full bg-accent-500 px-6 py-3 font-semibold text-gray-primary transition-colors hover:bg-accent-600"
        >
          Try again
        </Link>
      </div>
    );
  }
}
