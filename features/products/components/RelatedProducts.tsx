import * as React from 'react';
import Image from 'next/image';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Product } from '../types';

interface RelatedProductsProps {
  products: Partial<Product>[];
}

export function RelatedProducts({ products }: RelatedProductsProps) {
  return (
    <div className="mt-32 pb-20">
      <h2 className="text-2xl font-bold mb-8">Related Products</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product, index) => (
          <Card key={index} className="group bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-4 transition-all hover:shadow-xl hover:-translate-y-1">
            <CardContent className="p-0">
              <div className="aspect-square rounded-xl overflow-hidden mb-4 bg-slate-100 dark:bg-slate-800 relative">
                <Image
                  src={product.images?.[0] || ''}
                  alt={product.name || ''}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-1">{product.name}</h3>
              <p className="text-slate-500 text-sm mb-4">Ultra-thin powerhouse</p>
              <div className="flex justify-between items-center">
                <span className="font-bold text-primary">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  }).format(product.price || 0)}
                </span>
                <Button size="icon" className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-primary hover:text-white transition-all">
                  <Plus className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
