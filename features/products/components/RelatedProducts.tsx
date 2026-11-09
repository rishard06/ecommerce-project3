import * as React from "react";
import ProductCard from "@/features/products/components/ProductCard";
import { Product } from "../types";

interface RelatedProductsProps {
  products: Partial<Product>[];
}

export function RelatedProducts({ products }: RelatedProductsProps) {
  if (products.length === 0) return null;

  return (
    <section className="mt-24 pb-16">
      <h2 className="mb-6 text-2xl font-semibold tracking-tight text-gray-primary md:text-3xl">
        Related products
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
        {products.map((product, index) => (
          <ProductCard
            key={product.id ?? index}
            slug={product.id ?? ""}
            variantId={product.defaultVariantId ?? ""}
            title={product.name ?? ""}
            priceCents={product.priceCents ?? 0}
            image={product.images?.[0] ?? ""}
            description={product.description || "Premium quality product"}
          />
        ))}
      </div>
    </section>
  );
}
