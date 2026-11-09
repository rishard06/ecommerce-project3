import React from "react";
import Link from "next/link";
import { ArrowRight as ArrowRightIcon } from "lucide-react";
import { getFeatureProducts } from "@/lib/products";
import ProductCard from "./ProductCard";

export default async function FeatureProducts() {
  const featureProducts = await getFeatureProducts();

  return (
    <section className="w-full px-4 py-20 sm:px-6 md:py-28">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:mb-10 sm:flex-row sm:items-end">
          <div>
            <h2 className="mb-2 text-3xl font-semibold tracking-tight text-gray-primary md:text-4xl">
              Featured products
            </h2>
            <p className="text-gray-secondary">
              What people are actually buying right now.
            </p>
          </div>
          <Link
            href="/products"
            className="group flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-semibold text-accent-700 transition-colors hover:text-accent-600"
          >
            View all
            <ArrowRightIcon
              className="size-4 transition-transform duration-200 ease-out-quart group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
          {featureProducts.map((product, i) => (
            <ProductCard
              key={product.slug}
              slug={product.slug}
              variantId={product.defaultVariantId}
              title={product.title}
              priceCents={product.priceCents}
              image={product.image}
              description={product.description}
              isPopular
            />
          ))}
        </div>
      </div>
    </section>
  );
}
