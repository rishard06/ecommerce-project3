"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Lock, ShoppingBag } from "lucide-react";
import { useCartStore, useSelectedCartItems } from "@/lib/store/cart-store";
import { getOrderTotals } from "@/lib/pricing";
import { formatCents } from "@/lib/money";

export function CheckoutSummary() {
  const [mounted, setMounted] = useState(false);
  const allItems = useCartStore((state) => state.items);
  const items = useSelectedCartItems();
  const getSelectedPriceCents = useCartStore(
    (state) => state.getSelectedPriceCents,
  );

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

  // Display-only estimate from integer cents. The review step replaces this
  // with the authoritative server quote before any Stripe handoff.
  // Only checked lines are shown — the rest of the cart stays behind.
  const subtotalCents = getSelectedPriceCents();
  const { taxCents, totalCents } = getOrderTotals(subtotalCents);

  if (items.length === 0) {
    const nothingSelected = allItems.length > 0;

    return (
      <div className="sticky top-24 space-y-5">
        <div className="glass-component p-6 md:p-8">
          <h2 className="mb-5 text-lg font-semibold tracking-tight text-gray-primary">
            Order summary
          </h2>
          <div className="space-y-3 py-10 text-center">
            <ShoppingBag
              className="mx-auto size-10 text-gray-quaternary"
              aria-hidden="true"
            />
            <p className="font-medium text-gray-tertiary">
              {nothingSelected ? "No items selected" : "Your cart is empty"}
            </p>
            {nothingSelected ? (
              <Link
                href="/cart"
                className="inline-block text-sm font-semibold text-gray-secondary underline underline-offset-2 hover:text-gray-primary"
              >
                Choose items
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-24 space-y-5">
      <div className="glass-component p-6 md:p-7">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-gray-primary">
            Order summary
          </h2>
          {allItems.length !== items.length ? (
            <Link
              href="/cart"
              className="text-sm font-semibold text-gray-tertiary underline underline-offset-2 transition-colors hover:text-gray-primary"
            >
              Edit selection
            </Link>
          ) : null}
        </div>

        <ul className="custom-scrollbar mb-6 max-h-[360px] space-y-3 overflow-y-auto pr-1">
          {items.map((item) => (
            <li key={item.variantId} className="flex items-start gap-3">
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
                <p className="mb-1 text-xs text-gray-tertiary">
                  Qty: {item.quantity}
                </p>
                <span className="text-sm font-semibold tabular-nums text-gray-secondary">
                  {formatCents(item.priceCents * item.quantity)}
                </span>
              </div>
            </li>
          ))}
        </ul>

        <dl className="mb-6 space-y-2.5 border-t border-gray-primary/10 pt-5 text-sm">
          <div className="flex justify-between">
            <dt className="font-medium text-gray-tertiary">Subtotal</dt>
            <dd className="font-semibold tabular-nums text-gray-secondary">
              {formatCents(subtotalCents)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="font-medium text-gray-tertiary">Shipping</dt>
            <dd className="font-semibold text-green-600">Free</dd>
          </div>
          <div className="flex justify-between">
            <dt className="font-medium text-gray-tertiary">Estimated tax</dt>
            <dd className="font-semibold tabular-nums text-gray-secondary">
              {formatCents(taxCents)}
            </dd>
          </div>
          <div className="flex items-center justify-between border-t border-gray-primary/10 pt-3.5">
            <dt className="text-base font-semibold text-gray-primary">Total</dt>
            <dd className="text-xl font-semibold tabular-nums tracking-tight text-gray-primary">
              {formatCents(totalCents)}
            </dd>
          </div>
        </dl>

        <p className="mt-4 rounded-xl border border-white/50 bg-white/40 px-4 py-3 text-xs leading-relaxed text-gray-tertiary">
          This total is an estimate. The review step re-quotes your cart from
          the catalog and Stripe charges that server-quoted total.
        </p>

        <p className="mt-4 text-center text-xs leading-relaxed text-gray-quaternary">
          By placing your order, you agree to our{" "}
          <a
            href="/terms"
            className="underline underline-offset-2 hover:text-gray-primary"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="/privacy"
            className="underline underline-offset-2 hover:text-gray-primary"
          >
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
