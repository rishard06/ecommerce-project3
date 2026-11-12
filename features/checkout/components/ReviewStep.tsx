"use client";

import { Button } from "@/components/ui/button";
import { Loader2, Lock, MapPin, CreditCard, Truck } from "lucide-react";
import { getOrderTotals, type ShippingMethod } from "@/lib/pricing";
import type { CheckoutStatus, PaymentMethod, ShippingAddress } from "../types";

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  stripe: "Credit card (Stripe)",
  paypal: "PayPal",
  crypto: "Crypto",
};

interface ReviewStepProps {
  shipping: ShippingAddress;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  subtotal: number;
  coupon?: string;
  status: CheckoutStatus;
  error: string | null;
  onBack: () => void;
  onSubmit: () => void;
}

export function ReviewStep({
  shipping,
  shippingMethod,
  paymentMethod,
  subtotal,
  coupon,
  status,
  error,
  onBack,
  onSubmit,
}: ReviewStepProps) {
  const { shipping: shippingCost, tax, discount, total } = getOrderTotals(
    subtotal,
    shippingMethod,
    coupon || undefined
  );
  const isBusy = status === "processing" || status === "validating";

  return (
    <section className="glass-component space-y-8 p-6 shadow-sm md:p-8">
      <h2 className="flex items-center gap-3 text-xl font-bold text-gray-primary">
        <span className="flex size-8 items-center justify-center rounded-full bg-gray-primary text-sm font-bold text-white">
          3
        </span>
        Review Order
      </h2>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/40 bg-white/30 p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-primary">
            <MapPin className="size-4 text-accent-700" aria-hidden="true" />
            Ship to
          </div>
          <p className="text-sm leading-relaxed text-gray-tertiary">
            {shipping.firstName} {shipping.lastName}
            <br />
            {shipping.address}
            <br />
            {shipping.city}, {shipping.postalCode}
            <br />
            {shipping.country}
          </p>
        </div>

        <div className="rounded-2xl border border-white/40 bg-white/30 p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-primary">
            <Truck className="size-4 text-accent-700" aria-hidden="true" />
            Delivery
          </div>
          <p className="text-sm capitalize text-gray-tertiary">{shippingMethod}</p>
          <p className="mt-1 text-xs text-gray-tertiary">
            {shippingCost === 0 ? "Free shipping" : `$${shippingCost.toFixed(2)} shipping`}
          </p>
        </div>

        <div className="rounded-2xl border border-white/40 bg-white/30 p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-primary">
            <CreditCard className="size-4 text-accent-700" aria-hidden="true" />
            Payment
          </div>
          <p className="text-sm text-gray-tertiary">{PAYMENT_LABELS[paymentMethod]}</p>
          <p className="mt-1 text-xs text-gray-tertiary">Test mode - no charge</p>
        </div>
      </div>

      <dl className="space-y-2.5 border-t border-gray-primary/10 pt-5 text-sm">
        <div className="flex justify-between">
          <dt className="font-medium text-gray-tertiary">Subtotal</dt>
          <dd className="font-semibold tabular-nums text-gray-secondary">
            ${subtotal.toFixed(2)}
          </dd>
        </div>
        {discount ? (
          <div className="flex justify-between">
            <dt className="font-medium text-gray-tertiary">Discount</dt>
            <dd className="font-semibold tabular-nums text-accent-700">
              -${discount.toFixed(2)}
            </dd>
          </div>
        ) : null}
        <div className="flex justify-between">
          <dt className="font-medium text-gray-tertiary">Shipping</dt>
          <dd className="font-semibold tabular-nums text-gray-secondary">
            {shippingCost === 0 ? "Free" : `$${shippingCost.toFixed(2)}`}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="font-medium text-gray-tertiary">Estimated tax</dt>
          <dd className="font-semibold tabular-nums text-gray-secondary">${tax.toFixed(2)}</dd>
        </div>
        <div className="flex items-center justify-between border-t border-gray-primary/10 pt-3.5">
          <dt className="text-base font-semibold text-gray-primary">Total</dt>
          <dd className="text-xl font-semibold tabular-nums tracking-tight text-gray-primary">
            ${total.toFixed(2)}
          </dd>
        </div>
      </dl>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm font-medium text-destructive"
        >
          <span className="size-1.5 shrink-0 rounded-full bg-destructive" aria-hidden="true" />
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isBusy}
          className="h-12 flex-1 rounded-2xl border-gray-primary/15 bg-white/40 font-semibold text-gray-primary hover:bg-white/70"
        >
          Back to payment
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={isBusy}
          className="h-12 flex-[2] rounded-2xl bg-gray-primary font-semibold text-white hover:bg-gray-secondary"
        >
          {isBusy ? (
            <>
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
              {status === "validating" ? "Validating..." : "Placing order..."}
            </>
          ) : (
            <>
              <Lock className="size-5" aria-hidden="true" />
              Place order &middot; ${total.toFixed(2)}
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
