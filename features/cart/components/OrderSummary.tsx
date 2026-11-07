"use client";

import Link from "next/link";
import { ArrowRight, CreditCard, Wallet, Landmark } from "lucide-react";
import { useCartStore } from "@/lib/store/cart-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getOrderTotals } from "@/lib/pricing";

export function OrderSummary() {
  const { getTotalPrice } = useCartStore();
  const { subtotal, tax, total } = getOrderTotals(getTotalPrice());

  return (
    <div className="space-y-5">
      <div className="glass-component p-6 md:p-7">
        <h2 className="mb-5 text-lg font-semibold tracking-tight text-gray-primary">
          Order summary
        </h2>
        <dl className="mb-7 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="font-medium text-gray-tertiary">Subtotal</dt>
            <dd className="font-semibold tabular-nums text-gray-secondary">
              ${subtotal.toLocaleString()}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="font-medium text-gray-tertiary">Shipping</dt>
            <dd className="font-semibold text-green-600">Free</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="font-medium text-gray-tertiary">Estimated tax</dt>
            <dd className="font-semibold tabular-nums text-gray-secondary">
              ${tax.toFixed(2)}
            </dd>
          </div>
          <div className="flex items-center justify-between border-t border-gray-primary/10 pt-3 text-base">
            <dt className="font-semibold text-gray-primary">Total</dt>
            <dd className="font-semibold tabular-nums text-gray-primary">
              ${total.toLocaleString()}
            </dd>
          </div>
        </dl>

        <div className="space-y-3">
          <div className="relative">
            <label htmlFor="cart-promo" className="sr-only">
              Promo code
            </label>
            <Input
              id="cart-promo"
              className="h-11 rounded-full border-transparent bg-white/60 px-5 pr-24 text-sm placeholder:text-gray-quaternary focus-visible:bg-white/90"
              placeholder="Promo code"
            />
            <Button className="absolute right-1 top-1 h-9 rounded-full bg-gray-primary px-4 text-xs font-semibold text-white hover:bg-gray-secondary">
              Apply
            </Button>
          </div>
          <Link href="/checkout" className="block w-full">
            <Button className="group h-12 w-full rounded-full bg-accent-500 text-base font-semibold text-gray-primary shadow-soft hover:bg-accent-600">
              Proceed to checkout
              <ArrowRight
                className="size-4 transition-transform duration-200 ease-out-quart group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Button>
          </Link>
        </div>

        <div className="mt-7 border-t border-gray-primary/10 pt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-quaternary">
            Accepted payments
          </p>
          <div className="flex gap-2">
            {[CreditCard, Wallet, Landmark].map((Icon, index) => (
              <div
                key={index}
                className="flex h-8 w-12 items-center justify-center rounded-lg border border-white/50 bg-white/50"
              >
                <Icon className="size-4 text-gray-tertiary" aria-hidden="true" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[1.75rem] bg-accent-500 p-6 shadow-soft">
        <div className="relative z-10">
          <h3 className="mb-1.5 text-lg font-semibold tracking-tight text-gray-primary">
            Save with venn. Prime
          </h3>
          <p className="mb-5 max-w-[220px] text-sm font-medium leading-relaxed text-gray-secondary">
            Free shipping and early access to new drops.
          </p>
          <Button className="h-9 rounded-full bg-gray-primary px-5 text-sm font-semibold text-white hover:bg-gray-secondary">
            Join now
          </Button>
        </div>
        <Landmark
          className="absolute -bottom-3 -right-2 size-24 text-gray-primary/10"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
