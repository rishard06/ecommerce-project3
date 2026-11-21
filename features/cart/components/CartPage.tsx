"use client";

import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/store/cart-store";
import { CartPageItem } from "./CartPageItem";
import { OrderSummary } from "./OrderSummary";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { AnimatePresence } from "motion/react";

export function CartPage() {
  const { items, getTotalItems, setAllSelected } = useCartStore();
  const totalItems = getTotalItems();
  const selectedIds = useCartStore((state) => state.selectedVariantIds);
  const allSelected = selectedIds === undefined;
  const selectedCount = allSelected ? items.length : items.filter((item) => selectedIds.includes(item.variantId)).length;

  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 px-4 text-center">
        <div className="flex size-20 items-center justify-center rounded-full border border-white/50 bg-white/50 shadow-soft backdrop-blur-xl">
          <ShoppingBag className="size-9 text-gray-tertiary" aria-hidden="true" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-primary">
            Your cart is empty
          </h1>
          <p className="font-medium text-gray-tertiary">
            Nothing here yet — that&apos;s easy to fix.
          </p>
        </div>
        <Link href="/products">
          <Button className="h-12 rounded-full bg-action px-7 font-semibold text-action-foreground shadow-soft hover:bg-action-hover">
            Start shopping
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:py-12 lg:px-8">
      <header className="mb-10 flex items-center justify-between md:mb-12">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-primary md:text-4xl">
            Your cart
          </h1>
          <p className="font-medium text-gray-tertiary">
            {totalItems} {totalItems === 1 ? "item" : "items"}
          </p>
        </div>
      </header>

      <main className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3 lg:gap-10">
        <div className="space-y-4 lg:col-span-2">
          <div className="glass-component flex items-center gap-3 px-4 py-3 sm:px-5">
            <Checkbox
              checked={allSelected}
              indeterminate={!allSelected && selectedCount > 0}
              onCheckedChange={(next) => setAllSelected(next)}
              aria-label={
                allSelected ? "Deselect all items" : "Select all items"
              }
            />
            <p className="text-sm font-medium text-gray-tertiary">
              {selectedCount === items.length
                ? `All ${items.length} ${items.length === 1 ? "item" : "items"} selected`
                : `${selectedCount} of ${items.length} selected`}
            </p>
          </div>
          <AnimatePresence mode="popLayout" initial={false}>
            {items.map((item) => (
              <CartPageItem key={item.variantId} item={item} />
            ))}
          </AnimatePresence>

          <Link
            href="/products"
            className="mt-2 inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm font-semibold text-gray-tertiary transition-colors hover:text-gray-primary"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Continue shopping
          </Link>
        </div>

        <div className="lg:sticky lg:top-24">
          <OrderSummary />
        </div>
      </main>
    </div>
  );
}
