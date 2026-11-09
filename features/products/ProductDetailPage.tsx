import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProductGallery } from "./components/ProductGallery";
import { ProductInfo } from "./components/ProductInfo";
import { ProductTabs } from "./components/ProductTabs";
import { CustomerReviews } from "./components/CustomerReviews";
import { RelatedProducts } from "./components/RelatedProducts";
import { Product } from "./types";

interface ProductDetailPageProps {
  product: Product;
  relatedProducts: Partial<Product>[];
}

export function ProductDetailPage({ product, relatedProducts }: ProductDetailPageProps) {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex flex-wrap items-center gap-2 text-sm font-medium text-gray-tertiary md:mb-8"
      >
        <Link href="/" className="rounded transition-colors hover:text-primary">
          Home
        </Link>
        <ChevronRight className="size-4 text-gray-quaternary" aria-hidden="true" />
        <Link
          href={`/products?category=${product.category}&skip=0`}
          className="rounded capitalize transition-colors hover:text-primary"
        >
          {product.categoryName}
        </Link>
        <ChevronRight className="size-4 text-gray-quaternary" aria-hidden="true" />
        <span aria-current="page" className="truncate font-semibold text-gray-primary">
          {product.name}
        </span>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7">
          <ProductGallery images={product.images} />
        </div>
        <div className="lg:col-span-5">
          <ProductInfo product={product} />
        </div>
      </div>

      <ProductTabs product={product} />

      <CustomerReviews
        reviews={product.reviews}
        rating={product.rating}
        totalReviews={product.reviewCount}
      />

      <RelatedProducts products={relatedProducts} />
    </main>
  );
}
