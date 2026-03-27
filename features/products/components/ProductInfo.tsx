'use client';

import * as React from 'react';
import { Star, StarHalf, ShoppingCart, Heart, Truck, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Product } from '../types';
import { useCartStore } from '@/lib/store/cart-store';
import { useFavoritesStore } from '@/lib/store/favorites-store';
import { useSession } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface ProductInfoProps {
  product: Product;
}

export function ProductInfo({ product }: ProductInfoProps) {
  const addItem = useCartStore((state) => state.addItem);
  const { toggleFavorite, isFavorite } = useFavoritesStore();
  const { data: session } = useSession();
  const router = useRouter();

  const [selectedColor, setSelectedColor] = React.useState(0);
  const [selectedStorage, setSelectedStorage] = React.useState(0);

  const numericId = typeof product.id === "string" ? parseInt(product.id) : product.id;
  const favorited = isFavorite(numericId);

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

  const handleAddToCart = () => {
    if (!session) {
      router.push('/login');
      return;
    }

    addItem({
      id: numericId,
      title: product.name,
      price: product.price,
      image: product.images[0],
    });
  };

  const handleFavorite = () => {
    if (!session) {
      router.push('/login');
      return;
    }

    toggleFavorite({
      id: numericId,
      title: product.name,
      price: product.price,
      image: product.images[0],
      description: product.description,
    });
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="size-5 fill-yellow-400 text-yellow-300" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<StarHalf key={i} className="size-5 fill-yellow-400 text-yellow-300" />);
      } else {
        stars.push(<Star key={i} className="size-5 text-slate-300 dark:text-gray-quaternary" />);
      }
    }
    return stars;
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Badge variant="secondary" className="mb-4 bg-accent-500/60 text-accent-700 dark:text-accent-400 font-bold uppercase tracking-wider hover:bg-accent-500/20 rounded-full px-3 py-1 text-xs border border-accent-500/20">
          New Arrival
        </Badge>
        <h1 className="text-4xl font-black text-slate-900 dark:text-gray-primary leading-tight mb-2 tracking-tight">
          {product.name}
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            {renderStars(product.rating)}
            <span className="ml-2 text-slate-900 dark:text-gray-secondary font-bold">
              {product.rating}
            </span>
          </div>
          <span className="text-gray-tertiary text-sm">({product.reviewCount.toLocaleString()} Reviews)</span>
        </div>
      </div>

      <div className="py-6 border-y border-slate-200 dark:border-gray-quaternary">
        <div className="flex items-baseline gap-4 mb-4">
          <span className="text-4xl font-bold text-slate-900 dark:text-gray-secondary">{formattedPrice}</span>
          {formattedOriginalPrice && (
            <span className="text-xl text-slate-400 dark:text-gray-quaternary line-through">{formattedOriginalPrice}</span>
          )}
        </div>
        <p className="text-slate-600 dark:text-gray-tertiary leading-relaxed">
          {product.description}
        </p>
      </div>

      {product.colors && product.colors.length > 0 && (
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
                    ? "border-accent-500 ring-4 ring-accent-500/10 scale-110"
                    : "border-transparent hover:border-slate-400"
                )}
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
          </div>
        </div>
      )}

      {product.storage && product.storage.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="font-bold text-sm uppercase tracking-wide text-slate-500">Storage Capacity</h3>
          <div className="flex flex-wrap gap-2">
            {product.storage.map((size, index) => (
              <Button
                key={size}
                variant={selectedStorage === index ? "default" : "outline"}
                onClick={() => setSelectedStorage(index)}
                className={cn(
                  "px-6 py-2 h-auto font-bold rounded-xl transition-all",
                  selectedStorage === index 
                    ? "bg-accent-500 text-slate-900 hover:bg-accent-600 border-2 border-accent-500" 
                    : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-accent-500 hover:bg-accent-500/5"
                )}
              >
                {size}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4 pt-4">
        <Button 
          className="flex-1 bg-accent-500 hover:bg-accent-600 text-gray-secondary font-bold py-4 rounded-2xl shadow-xl shadow-accent-500/20 transition-all gap-2 h-auto text-lg active:scale-95 hover:cursor-pointer group"
          onClick={handleAddToCart}
        >
          <ShoppingCart className="size-5 group-hover:translate-x-1 transition-transform" />
          Add to Cart
        </Button>
        <Button 
          variant="outline" 
          className={cn(
            "size-14 rounded-2xl border-slate-200 dark:border-slate-800 transition-all p-0 active:scale-95 hover:cursor-pointer",
            favorited 
              ? "text-red-500 border-red-500 bg-red-50 dark:bg-red-950/20" 
              : "text-slate-500 hover:text-red-500 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
          )}
          onClick={handleFavorite}
        >
          <motion.div
            initial={false}
            animate={{ scale: favorited ? [1, 1.2, 1] : 1 }}
          >
            <Heart 
              className="size-6" 
              fill={favorited ? "currentColor" : "none"} 
            />
          </motion.div>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="flex items-center gap-3 p-4 rounded-2xl glass-component border border-white/40 shadow-xl shadow-black/5">
          <div className="size-10 rounded-xl bg-accent-500/40 flex items-center justify-center">
            <Truck className="size-5 text-accent-700 dark:text-accent-400" />
          </div>
          <div className="text-xs">
            <p className="font-bold text-slate-900 dark:text-gray-secondary">Free Shipping</p>
            <p className="text-gray-tertiary">Orders over $500</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-2xl glass-component border border-white/40 shadow-xl shadow-black/5">
          <div className="size-10 rounded-xl bg-accent-500/40 flex items-center justify-center">
            <ShieldCheck className="size-5 text-accent-700 dark:text-accent-400" />
          </div>
          <div className="text-xs">
            <p className="font-bold text-slate-900 dark:text-gray-secondary">2 Year Warranty</p>
            <p className="text-gray-tertiary">Full coverage</p>
          </div>
        </div>
      </div>
    </div>
  );
}

