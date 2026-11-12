"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, Package } from "lucide-react";
import { useCartStore } from "@/lib/store/cart-store";

export function SuccessContent({ orderId }: { orderId: string }) {
  const clearCart = useCartStore((state) => state.clearCart);

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return (
    <div className="glass-component mx-auto max-w-2xl space-y-6 p-10 text-center shadow-panel md:p-12">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent-500 shadow-soft">
        <CheckCircle2 className="size-8 text-gray-primary" aria-hidden="true" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-primary md:text-3xl">
          Order placed
        </h1>
        <p className="mx-auto max-w-md leading-relaxed text-gray-tertiary">
          Thank you for your purchase. This is a simulated order, so no payment was taken.
        </p>
      </div>

      <div className="rounded-2xl border border-white/40 bg-white/30 p-5">
        <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-tertiary">
          <Package className="size-4" aria-hidden="true" />
          Order number
        </div>
        <p className="mt-2 break-all font-mono text-lg font-semibold text-gray-primary">
          {orderId}
        </p>
      </div>

      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          href="/account"
          className="inline-flex h-12 items-center justify-center rounded-full bg-gray-primary px-8 text-sm font-semibold text-white transition-colors hover:bg-gray-secondary"
        >
          View account
        </Link>
        <Link
          href="/products"
          className="inline-flex h-12 items-center justify-center rounded-full border border-gray-primary/15 bg-white/40 px-8 text-sm font-semibold text-gray-primary transition-colors hover:bg-white/70"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
