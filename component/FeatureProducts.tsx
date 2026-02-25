import React from "react";
import Link from "next/link";
import { ArrowRight as ArrowRightIcon } from "lucide-react";
import getFeatureProducts from "@/lib/hooks/getFeatureProducts";
import ProductCard from "./ProductCard";

export default async function FeatureProducts() {
  const featureProducts = await getFeatureProducts();
  
  return (
    <section className="min-h-screen w-full flex items-center py-16 px-4">
      <div className="max-w-[80%] mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-10">
          <div>
            <h2 className="text-3xl font-bold mb-2">Featured Products</h2>
            <p className="text-gray-secondary">
              Our most popular accessories and equipment
            </p>
          </div>
          <Link
            href="/products"
            className="text-accent-700 flex items-center gap-1"
          >
            View All <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {featureProducts.map((product) => (
            <ProductCard
              key={featureProducts.indexOf(product)}
              id={product.id}
              title={product.title}
              price={product.price}
              image={product.images[1] || ""}
              description={product.description}
              isPopular={true}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
