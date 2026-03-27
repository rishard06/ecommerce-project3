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

  try {
    const [categories, productData] = await Promise.all([
      getCategories(),
      getProducts(currentCategory, skip, limit),
    ]);

    const { products, total } = productData;

    return (
      <div className="min-h-[calc(100vh-136px)] mx-4 md:mx-10 flex flex-col lg:flex-row justify-center gap-8 py-8">
        <CategorySidebar categories={categories} currentCategory={currentCategory} />

        {/* Products Content */}
        <div className="w-full lg:w-3/4 bg-white/60 backdrop-blur-md rounded-3xl shadow-lg p-6 md:p-8 border border-white/20 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 capitalize">
              {currentCategory ? currentCategory.replace(/-/g, " ") : "All Products"}
            </h1>
            <p className="text-sm text-gray-500 font-medium">
              Showing {Math.min(skip + 1, total)} - {Math.min(skip + products.length, total)} of {total} results
            </p>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mb-10">
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
            <div className="flex-1 flex flex-col items-center justify-center py-20">
              <p className="text-xl text-gray-500 font-medium">No products found in this category.</p>
              <Link href="/products" className="mt-4 text-accent-600 hover:underline">
                View all products
              </Link>
            </div>
          )}

          {/* Pagination */}
          <div className="mt-auto flex justify-center items-center gap-4">
            <Link
              href={skip > 0 ? `/products?${currentCategory ? `category=${currentCategory}&` : ""}skip=${Math.max(0, skip - limit)}` : "#"}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all duration-300 ${
                skip > 0 
                  ? "bg-white text-gray-800 hover:bg-accent-500 hover:text-white shadow-md" 
                  : "bg-gray-100 text-gray-300 cursor-not-allowed"
              }`}
              aria-disabled={skip === 0}
            >
              <ChevronLeft size={20} />
              Previous
            </Link>

            <div className="text-sm font-bold text-gray-500">
              Page {Math.floor(skip / limit) + 1}
            </div>

            <Link
              href={skip + limit < total ? `/products?${currentCategory ? `category=${currentCategory}&` : ""}skip=${skip + limit}` : "#"}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all duration-300 ${
                skip + limit < total 
                  ? "bg-white text-gray-800 hover:bg-accent-500 hover:text-white shadow-md" 
                  : "bg-gray-100 text-gray-300 cursor-not-allowed"
              }`}
              aria-disabled={skip + limit >= total}
            >
              Next
              <ChevronRight size={20} />
            </Link>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error loading products:", error);
    return (
      <div className="min-h-[calc(100vh-136px)] flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Something went wrong</h1>
        <p className="text-gray-600 mb-6">We couldn't load the products at this time.</p>
        <Link 
          href="/products" 
          className="px-6 py-3 bg-accent-500 text-white rounded-full font-bold hover:bg-accent-600 transition-colors"
        >
          Try Again
        </Link>
      </div>
    );
  }
}
