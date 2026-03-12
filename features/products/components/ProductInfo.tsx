'use client';

import * as React from 'react';
import { Star, ShoppingCart, Heart, Truck, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Product } from '../types';

interface ProductInfoProps {
  product: Product;
}

export function ProductInfo({ product }: ProductInfoProps) {
  const [selectedColor, setSelectedColor] = React.useState(0);
  const [selectedStorage, setSelectedStorage] = React.useState(0);

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(product.price);

  const formattedOriginalPrice = product.originalPrice
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(product.originalPrice)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary font-bold uppercase tracking-wider hover:bg-primary/20 rounded-full px-3 py-1 text-xs">
          New Arrival
        </Badge>
        <h1 className="text-4xl font-black text-slate-900 dark:text-white leading-tight mb-2">
          {product.name}
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-primary">
            {[...Array(4)].map((_, i) => (
              <Star key={i} className="size-5 fill-current" />
            ))}
            <Star className="size-5" /> {/* Star half would be better but keeping it simple */}
            <span className="ml-2 text-slate-900 dark:text-slate-100 font-bold">
              {product.rating}
            </span>
          </div>
          <span className="text-slate-500 text-sm">({product.reviewCount.toLocaleString()} Reviews)</span>
        </div>
      </div>

      <div className="py-6 border-y border-slate-200 dark:border-slate-800">
        <div className="flex items-baseline gap-4 mb-4">
          <span className="text-4xl font-bold text-slate-900 dark:text-white">{formattedPrice}</span>
          {formattedOriginalPrice && (
            <span className="text-xl text-slate-400 line-through">{formattedOriginalPrice}</span>
          )}
        </div>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
          {product.description}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="font-bold text-sm uppercase tracking-wide text-slate-500">Select Color</h3>
        <div className="flex gap-3">
          {product.colors.map((color, index) => (
            <button
              key={color.name}
              onClick={() => setSelectedColor(index)}
              className={cn(
                "size-10 rounded-full border-2 transition-all cursor-pointer",
                selectedColor === index
                  ? "border-accent-500 ring-2 ring-accent-500/20"
                  : "border-transparent hover:border-slate-400"
              )}
              style={{ backgroundColor: color.hex }}
              title={color.name}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="font-bold text-sm uppercase tracking-wide text-slate-500">Storage Capacity</h3>
        <div className="flex flex-wrap gap-2">
          {product.storage.map((size, index) => (
            <Button
              key={size}
              variant={selectedStorage === index ? "default" : "outline"}
              onClick={() => setSelectedStorage(index)}
              className={cn(
                "px-6 py-2 h-auto font-bold rounded-lg transition-all",
                selectedStorage === index 
                  ? "bg-accent-500 text-gray-primary hover:bg-accent-600 border-2 border-accent-500" 
                  : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-accent-500"
              )}
            >
              {size}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <Button className="flex-1 bg-accent-500 hover:bg-accent-600 text-gray-primary font-bold py-4 rounded-xl shadow-lg shadow-accent-500/20 transition-all gap-2 h-auto text-lg">
          <ShoppingCart className="size-5" />
          Add to Cart
        </Button>
        <Button variant="outline" className="size-14 rounded-xl border-slate-200 dark:border-slate-800 text-slate-500 hover:text-red-500 hover:border-red-500 transition-all p-0">
          <Heart className="size-6" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <Truck className="size-5 text-primary" />
          <div className="text-xs">
            <p className="font-bold">Free Shipping</p>
            <p className="text-slate-500">Orders over $500</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <ShieldCheck className="size-5 text-primary" />
          <div className="text-xs">
            <p className="font-bold">2 Year Warranty</p>
            <p className="text-slate-500">Full coverage</p>
          </div>
        </div>
      </div>
    </div>
  );
}
