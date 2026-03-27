import * as React from 'react';
import ProductCard from '@/features/products/components/ProductCard';
import { Product } from '../types';

interface RelatedProductsProps {
  products: Partial<Product>[];
}

export function RelatedProducts({ products }: RelatedProductsProps) {
  return (
    <div className="mt-32 pb-20">
      <h2 className="text-3xl font-black mb-8 tracking-tight">Related Products</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product, index) => (
          <ProductCard
            key={index}
            id={product.id || index + 1}
            title={product.name || ''}
            price={product.price || 0}
            image={product.images?.[0] || ''}
            description={product.description || 'Premium quality product'}
          />
        ))}
      </div>
    </div>
  );
}
