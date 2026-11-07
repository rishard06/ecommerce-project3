"use client";

import React, { useEffect, useState } from "react";
import { useFavoritesStore } from "@/lib/store/favorites-store";
import ProductCard from "@/features/products/components/ProductCard";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { HeartOff, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { spring } from "@/lib/motion";

export default function FavoritesPage() {
  const items = useFavoritesStore((state) => state.items);
  const [mounted, setMounted] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    setMounted(true);
  }, []);

  const count = mounted ? items.length : 0;
  const showItems = mounted && items.length > 0;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <header className="mb-8 md:mb-12">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-tertiary">
          Saved
        </p>
        <h1 className="mb-2 text-3xl font-semibold tracking-tight text-gray-primary md:text-5xl">
          Your collection
        </h1>
        <p className="font-medium text-gray-tertiary">
          {count} {count === 1 ? "item" : "items"} saved for later
        </p>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        {showItems ? (
          <motion.div
            key="grid"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={spring.smooth}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4"
          >
            {items.map((item) => (
              <ProductCard key={item.id} {...item} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={spring.smooth}
            className="glass-component flex flex-col items-center justify-center px-6 py-20 text-center"
          >
            <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-gray-primary/[0.04]">
              <HeartOff className="size-8 text-gray-quaternary" aria-hidden="true" />
            </div>
            <h2 className="mb-2 text-xl font-semibold tracking-tight text-gray-primary">
              Nothing saved yet
            </h2>
            <p className="mb-8 max-w-sm font-medium text-gray-tertiary">
              Tap the heart on any product to keep it here.
            </p>
            <Button asChild className="h-12 rounded-full bg-accent-500 px-7 font-semibold text-gray-primary shadow-soft hover:bg-accent-600">
              <Link href="/products" className="flex items-center gap-2">
                Explore products
                <ShoppingBag className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
