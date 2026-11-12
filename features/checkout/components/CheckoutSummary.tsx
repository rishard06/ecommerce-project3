"use client";

import { useState, useEffect } from "react";
import { useCartStore } from "@/lib/store/cart-store";
import { Lock, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getOrderTotals } from "@/lib/pricing";

export function CheckoutSummary() {
  const [mounted, setMounted] = useState(false);
  const { items, getTotalPrice } = useCartStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="sticky top-24 space-y-5">
        <div className="glass-component flex h-80 items-center justify-center p-6 md:p-8">
          <div className="flex animate-pulse flex-col items-center gap-3">
            <div className="size-10 rounded-full bg-gray-primary/10" />
            <div className="h-3 w-32 rounded-full bg-gray-primary/10" />
          </div>
        </div>
      </div>
    );
  }

  const subtotal = getTotalPrice();
  const { tax, total } = getOrderTotals(subtotal);

  if (items.length === 0) {
    return (
      <div className="sticky top-24 space-y-5">
        <div className="glass-component p-6 md:p-8">
          <h2 className="mb-5 text-lg font-semibold tracking-tight text-gray-primary">
            Order summary
          </h2>
          <div className="space-y-3 py-10 text-center">
            <ShoppingBag className="mx-auto size-10 text-gray-quaternary" aria-hidden="true" />
            <p className="font-medium text-gray-tertiary">Your cart is empty</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-24 space-y-5">
      <div className="glass-component p-6 md:p-7">
        <h2 className="mb-5 text-lg font-semibold tracking-tight text-gray-primary">
          Order summary
        </h2>

        <ul className="custom-scrollbar mb-6 max-h-[360px] space-y-3 overflow-y-auto pr-1">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-xl border border-white/50 bg-white/60 p-1.5">
                <Image
                  src={item.image}
                  alt=""
                  width={64}
                  height={64}
                  sizes="64px"
                  className="size-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="mb-0.5 truncate text-sm font-semibold text-gray-primary">
                  {item.title}
                </h3>
                <p className="mb-1 text-xs text-gray-tertiary">Qty: {item.quantity}</p>
                <span className="text-sm font-semibold tabular-nums text-gray-secondary">
                  ${(item.price * item.quantity).toLocaleString()}
                </span>
              </div>
            </li>
          ))}
        </ul>

        <div className="mb-6 rounded-2xl border border-white/40 bg-white/30 p-4 text-sm text-gray-tertiary">
          Have a code? Enter it in the{" "}
          <Link href="/checkout?step=payment" className="font-semibold text-gray-primary underline underline-offset-2">
            payment step
          </Link>{" "}
          (try DEMO10).
        </div>

        <dl className="mb-6 space-y-2.5 border-t border-gray-primary/10 pt-5 text-sm">
          <div className="flex justify-between">
            <dt className="font-medium text-gray-tertiary">Subtotal</dt>
            <dd className="font-semibold tabular-nums text-gray-secondary">
              ${subtotal.toLocaleString()}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="font-medium text-gray-tertiary">Shipping</dt>
            <dd className="font-semibold text-green-600">Free</dd>
          </div>
          <div className="flex justify-between">
            <dt className="font-medium text-gray-tertiary">Estimated tax</dt>
            <dd className="font-semibold tabular-nums text-gray-secondary">
              ${tax.toFixed(2)}
            </dd>
          </div>
          <div className="flex items-center justify-between border-t border-gray-primary/10 pt-3.5">
            <dt className="text-base font-semibold text-gray-primary">Total</dt>
            <dd className="text-xl font-semibold tabular-nums tracking-tight text-gray-primary">
              ${total.toLocaleString()}
            </dd>
          </div>
        </dl>

        <p className="mt-4 text-center text-xs leading-relaxed text-gray-quaternary">
          By placing your order, you agree to our{" "}
          <a href="/terms" className="underline underline-offset-2 hover:text-gray-primary">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" className="underline underline-offset-2 hover:text-gray-primary">
            Privacy Policy
          </a>
          .
        </p>
      </div>

      <div className="flex items-center justify-center gap-2 rounded-xl border border-green-600/20 bg-green-500/10 px-4 py-3 text-sm font-semibold text-green-700">
        <Lock className="size-4" aria-hidden="true" />
        Encrypted &amp; secure checkout
      </div>
    </div>
  );
}
