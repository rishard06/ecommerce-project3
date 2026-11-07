"use client";

import * as React from "react";
import { Star, StarHalf, ShoppingCart, Heart, Truck, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Product } from "../types";
import { useCartStore } from "@/lib/store/cart-store";
import { useFavoritesStore } from "@/lib/store/favorites-store";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { spring } from "@/lib/motion";

interface ProductInfoProps {
  product: Product;
}

export function ProductInfo({ product }: ProductInfoProps) {
  const addItem = useCartStore((state) => state.addItem);
  const { toggleFavorite, isFavorite } = useFavoritesStore();
  const { data: session } = useSession();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  const [selectedColor, setSelectedColor] = React.useState(0);
  const [selectedStorage, setSelectedStorage] = React.useState(0);

  const numericId = typeof product.id === "string" ? parseInt(product.id) : product.id;
  const favorited = isFavorite(numericId);

  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(product.price);

  const formattedOriginalPrice = product.originalPrice
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(product.originalPrice)
    : null;

  const handleAddToCart = () => {
    if (!session) {
      router.push("/login");
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
      router.push("/login");
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
        stars.push(
          <Star key={i} className="size-4 fill-yellow-500 text-yellow-500" aria-hidden="true" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <StarHalf key={i} className="size-4 fill-yellow-500 text-yellow-500" aria-hidden="true" />
        );
      } else {
        stars.push(
          <Star key={i} className="size-4 text-gray-quaternary" aria-hidden="true" />
        );
      }
    }
    return stars;
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Badge
          variant="secondary"
          className="mb-4 rounded-full border border-accent-500/25 bg-accent-500/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent-700"
        >
          New arrival
        </Badge>
        <h1 className="mb-2 text-balance text-3xl font-semibold leading-tight tracking-tight text-gray-primary md:text-4xl">
          {product.name}
        </h1>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-0.5"
            role="img"
            aria-label={`Rated ${product.rating} out of 5`}
          >
            {renderStars(product.rating)}
          </div>
          <span className="text-sm font-semibold tabular-nums text-gray-secondary">
            {product.rating}
          </span>
          <span className="text-sm text-gray-tertiary">
            ({product.reviewCount.toLocaleString()} reviews)
          </span>
        </div>
      </div>

      <div className="border-y border-gray-primary/10 py-6">
        <div className="mb-3 flex items-baseline gap-3">
          <span className="text-3xl font-semibold tabular-nums tracking-tight text-gray-primary md:text-4xl">
            {formattedPrice}
          </span>
          {formattedOriginalPrice && (
            <span className="text-lg tabular-nums text-gray-quaternary line-through">
              {formattedOriginalPrice}
            </span>
          )}
        </div>
        <p className="leading-relaxed text-gray-secondary">{product.description}</p>
      </div>

      {product.colors && product.colors.length > 0 && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-tertiary">
            Color
          </legend>
          <div className="flex gap-2.5">
            {product.colors.map((color, index) => (
              <button
                key={color.name}
                type="button"
                onClick={() => setSelectedColor(index)}
                aria-label={`Color: ${color.name}`}
                aria-pressed={selectedColor === index}
                className={cn(
                  "flex size-11 items-center justify-center rounded-full border-2 transition-[transform,box-shadow,border-color] duration-200 ease-out-quart",
                  selectedColor === index
                    ? "scale-105 border-accent-600 ring-2 ring-accent-500/25 ring-offset-2 ring-offset-background"
                    : "border-transparent hover:border-gray-primary/25"
                )}
              >
                <span
                  className="size-8 rounded-full border border-black/10"
                  style={{ backgroundColor: color.hex }}
                />
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {product.storage && product.storage.length > 0 && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-tertiary">
            Storage
          </legend>
          <div className="flex flex-wrap gap-2">
            {product.storage.map((size, index) => (
              <Button
                key={size}
                type="button"
                variant={selectedStorage === index ? "default" : "outline"}
                onClick={() => setSelectedStorage(index)}
                aria-pressed={selectedStorage === index}
                className={cn(
                  "h-11 rounded-xl px-5 font-semibold transition-[background-color,border-color,color] duration-200",
                  selectedStorage === index
                    ? "border-2 border-accent-500 bg-accent-500 text-gray-primary hover:bg-accent-600"
                    : "border-gray-primary/15 bg-white/50 text-gray-secondary hover:border-accent-600 hover:bg-accent-500/10"
                )}
              >
                {size}
              </Button>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          className="group h-14 flex-1 gap-2 rounded-2xl bg-accent-500 text-base font-semibold text-gray-primary shadow-soft hover:bg-accent-600"
          onClick={handleAddToCart}
        >
          <ShoppingCart
            className="size-5 transition-transform duration-200 ease-out-quart group-hover:translate-x-0.5"
            aria-hidden="true"
          />
          Add to cart
        </Button>
        <Button
          variant="outline"
          className={cn(
            "size-14 rounded-2xl border-gray-primary/15 p-0 transition-colors",
            favorited
              ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15"
              : "bg-white/50 text-gray-secondary hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
          )}
          onClick={handleFavorite}
          aria-pressed={favorited}
          aria-label={favorited ? "Remove from favorites" : "Save to favorites"}
        >
          <motion.span
            animate={prefersReducedMotion ? undefined : { scale: favorited ? 1.1 : 1 }}
            transition={spring.snappy}
            className="flex"
          >
            <Heart className="size-6" fill={favorited ? "currentColor" : "none"} aria-hidden="true" />
          </motion.span>
        </Button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-3">
        <div className="glass-component flex items-center gap-3 rounded-2xl p-4">
          <div className="flex size-10 items-center justify-center rounded-xl bg-accent-500/30">
            <Truck className="size-5 text-accent-700" aria-hidden="true" />
          </div>
          <div className="text-xs">
            <p className="font-semibold text-gray-primary">Free shipping</p>
            <p className="text-gray-tertiary">Orders over $500</p>
          </div>
        </div>
        <div className="glass-component flex items-center gap-3 rounded-2xl p-4">
          <div className="flex size-10 items-center justify-center rounded-xl bg-accent-500/30">
            <ShieldCheck className="size-5 text-accent-700" aria-hidden="true" />
          </div>
          <div className="text-xs">
            <p className="font-semibold text-gray-primary">2-year warranty</p>
            <p className="text-gray-tertiary">Full coverage</p>
          </div>
        </div>
      </div>
    </div>
  );
}
