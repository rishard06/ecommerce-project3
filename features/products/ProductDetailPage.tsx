import * as React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { ProductGallery } from './components/ProductGallery';
import { ProductInfo } from './components/ProductInfo';
import { ProductTabs } from './components/ProductTabs';
import { CustomerReviews } from './components/CustomerReviews';
import { RelatedProducts } from './components/RelatedProducts';
import { Product } from './types';

interface ProductDetailPageProps {
  product: Product;
  relatedProducts: Product[];
}

export function ProductDetailPage({ product, relatedProducts }: ProductDetailPageProps) {
  return (
    <main className="flex-1 max-w-[1280px] mx-auto w-full px-6 lg:px-10 py-8 font-display">
      <nav className="flex items-center gap-2 mb-8 text-sm font-semibold tracking-tight">
        <Link href="/" className="text-slate-600 hover:text-primary transition-colors cursor-pointer">Home</Link>
        <ChevronRight className="size-4 text-slate-500" />
        <Link href={`/products?category=${product.category}&skip=0`} className="text-slate-600 hover:text-primary transition-colors cursor-pointer capitalize">{product.category}</Link>
        <ChevronRight className="size-4 text-slate-500" />
        <span className="text-slate-800 dark:text-gray-quaternary font-bold">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
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
