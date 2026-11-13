import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProductGallery } from "./components/ProductGallery";
import { ProductInfo } from "./components/ProductInfo";
import { ProductTabs } from "./components/ProductTabs";
import { CustomerReviews } from "./components/CustomerReviews";
import { RelatedProducts } from "./components/RelatedProducts";
import { ReviewForm } from "./components/ReviewForm";
import { ReviewList } from "./components/ReviewList";
import { getProductReviews } from "./actions";
import { Product } from "./types";

interface ProductDetailPageProps {
  product: Product;
  relatedProducts: Partial<Product>[];
}

export async function ProductDetailPage({ product, relatedProducts }: ProductDetailPageProps) {
  const storeReviews = await getProductReviews(product.id);
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

      <section aria-label="Store reviews" className="mt-12 space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-primary">
            Store reviews
          </h2>
          <p className="text-sm text-gray-tertiary">
            Written by signed-in shoppers of this demo store.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <ReviewList
            reviews={storeReviews.map((review) => ({
              id: review.id,
              rating: review.rating,
              comment: review.comment,
              createdAt: review.createdAt,
            }))}
          />
          <ReviewForm productSlug={product.id} />
        </div>
      </section>

      <RelatedProducts products={relatedProducts} />
    </main>
  );
}
