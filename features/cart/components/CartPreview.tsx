"use client";

import React from "react";
import { useCartStore } from "@/lib/store/cart-store";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { CartItem } from "./CartItem";

export default function CartPreview() {
  const { items, removeItem, getTotalPrice, getTotalItems } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="p-10 text-center flex flex-col items-center gap-6 bg-white/40 backdrop-blur-xl">
        <div className="size-20 rounded-full bg-accent-500/10 flex items-center justify-center animate-pulse">
          <ShoppingBag className="size-10 text-accent-600/40" />
        </div>
        <div className="space-y-1">
          <p className="text-gray-primary font-black text-xl tracking-tight">Your cart is empty</p>
          <p className="text-gray-tertiary text-sm font-medium">Add some amazing products to start!</p>
        </div>
        <Button asChild variant="outline" className="rounded-full px-8 py-6 font-bold border-white/20 hover:bg-accent-500 hover:text-gray-primary transition-all">
          <Link href="/products">Explore Catalog</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col max-h-[500px] bg-white rounded-4xl">
      <div className="px-6 py-5 border-b border-white/20 flex justify-between items-center backdrop-blur-md">
        <h3 className="font-black text-gray-primary tracking-tight">CART ({getTotalItems()})</h3>
        <span className="font-black text-accent-600 text-lg">${getTotalPrice().toLocaleString()}</span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <CartItem key={item.id} item={item} onRemove={removeItem} />
          ))}
        </AnimatePresence>
      </div>

      <div className="p-5 border-t border-white/20 mt-auto">
        <Button asChild className="w-full bg-accent-500 hover:bg-gray-secondary/40 text-gray-secondary font-black py-7 rounded-2xl shadow-xl shadow-accent-500/20 active:scale-95 transition-all text-lg group">
          <Link href="/cart" className="flex items-center justify-center gap-2">
            CHECKOUT
            <ShoppingBag className="size-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
