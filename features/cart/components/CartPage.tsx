"use client";
import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/store/cart-store";
import { CartPageItem } from "./CartPageItem";
import { OrderSummary } from "./OrderSummary";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export function CartPage() {
  const { items, getTotalItems } = useCartStore();
  const totalItems = getTotalItems();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center px-4">
        <div className="size-24 bg-white/30 backdrop-blur-xl rounded-full flex items-center justify-center shadow-xl border border-white/40">
          <ShoppingBag className="size-12 text-gray-tertiary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-primary">Your cart is empty</h1>
          <p className="text-gray-tertiary font-medium">Looks like you haven't added anything to your cart yet.</p>
        </div>
        <Link href="/products">
          <Button className="bg-accent-500 text-gray-primary font-bold px-8 py-6 rounded-full hover:opacity-90 transition-all border-none shadow-lg shadow-accent-500/20 cursor-pointer">
            Start Shopping
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
      <header className="flex items-center justify-between mb-12">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-gray-primary tracking-tight">Shopping Cart</h1>
          <p className="text-gray-tertiary font-medium">{totalItems} {totalItems === 1 ? 'item' : 'items'} in your bag</p>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <CartPageItem key={item.id} item={item} />
              ))}
            </AnimatePresence>
          </div>
          
          <Link 
            href="/products" 
            className="inline-flex items-center gap-2 font-bold text-gray-tertiary hover:text-gray-primary transition-colors px-2 mt-4 cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
            Continue Shopping
          </Link>
        </div>

        <div className="lg:sticky lg:top-24">
          <OrderSummary />
        </div>
      </main>
    </div>
  );
}
