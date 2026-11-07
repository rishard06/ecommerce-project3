"use client";

import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/store/cart-store";
import { CartPageItem } from "./CartPageItem";
import { OrderSummary } from "./OrderSummary";
import { Button } from "@/components/ui/button";
import { AnimatePresence } from "motion/react";

export function CartPage() {
  const { items, getTotalItems } = useCartStore();
  const totalItems = getTotalItems();

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
          <Button className="h-12 rounded-full bg-accent-500 px-7 font-semibold text-gray-primary shadow-soft hover:bg-accent-600">
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
          <AnimatePresence mode="popLayout" initial={false}>
            {items.map((item) => (
              <CartPageItem key={item.id} item={item} />
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
