"use client";

import React from "react";
import { useCartStore } from "@/lib/store/cart-store";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AnimatePresence } from "motion/react";
import { CartItem } from "./CartItem";
import { formatCents } from "@/lib/money";

export default function CartPreview() {
  const { items, removeItem, getTotalPriceCents, getTotalItems } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 bg-white/40 p-9 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-accent-500/15">
          <ShoppingBag className="size-7 text-accent-700" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-semibold tracking-tight text-gray-primary">
            Your cart is empty
          </p>
          <p className="text-sm text-gray-tertiary">
            Add something you love to get started.
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          className="rounded-full border-gray-primary/15 px-6 font-semibold hover:bg-accent-500 hover:text-gray-primary"
        >
          <Link href="/products">Explore catalog</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex max-h-[min(500px,70vh)] flex-col bg-white/70">
      <div className="flex items-center justify-between border-b border-gray-primary/10 px-5 py-4">
        <h3 className="text-sm font-semibold tracking-tight text-gray-primary">
          Cart{" "}
          <span className="text-gray-tertiary" aria-live="polite">
            ({getTotalItems()})
          </span>
        </h3>
        <span className="text-base font-semibold text-accent-700">
          {formatCents(getTotalPriceCents())}
        </span>
      </div>

      <div className="custom-scrollbar flex-1 space-y-1 overflow-y-auto p-3">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <CartItem key={item.variantId} item={item} onRemove={removeItem} />
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-auto border-t border-gray-primary/10 p-4">
        <Button
          asChild
          className="h-12 w-full rounded-2xl bg-accent-500 text-base font-semibold text-gray-primary shadow-soft hover:bg-accent-600"
        >
          <Link href="/cart" className="flex items-center justify-center gap-2">
            Checkout
            <ShoppingBag
              className="size-5 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </Button>
      </div>
    </div>
  );
}
