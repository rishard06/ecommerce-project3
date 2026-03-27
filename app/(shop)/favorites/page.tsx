"use client";

import React from "react";
import { useFavoritesStore } from "@/lib/store/favorites-store";
import ProductCard from "@/features/products/components/ProductCard";
import { motion, AnimatePresence } from "framer-motion";
import { HeartOff, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function FavoritesPage() {
  const { items, getTotalItems } = useFavoritesStore();
  const count = getTotalItems();

  return (
    <div className="min-h-screen py-24 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-2">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-5xl md:text-7xl font-black text-gray-primary tracking-tighter"
            >
              MY COLLECTION
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-gray-tertiary font-medium text-lg"
            >
              {count} items saved for later
            </motion.p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {items.length > 0 ? (
            <motion.div 
              key="grid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
            >
              {items.map((item) => (
                <ProductCard key={item.id} {...item} />
              ))}
            </motion.div>
          ) : (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center py-32 glass-component rounded-[3rem] border-white/40 text-center"
            >
              <div className="size-24 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center mb-8 border border-white/40">
                <HeartOff className="size-12 text-gray-tertiary/50" />
              </div>
              <h2 className="text-3xl font-black text-gray-primary tracking-tight mb-4">
                Your collection is empty
              </h2>
              <p className="text-gray-tertiary max-w-md mx-auto mb-10 font-medium">
                Start adding items you love to your collection and they'll appear here.
              </p>
              <Button asChild className="bg-accent-500 hover:bg-accent-600 text-gray-secondary font-black px-10 py-7 rounded-2xl shadow-xl shadow-accent-500/20 active:scale-95 transition-all text-lg group">
                <Link href="/products" className="flex items-center gap-3">
                  EXPLORE PRODUCTS
                  <ShoppingBag className="size-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
