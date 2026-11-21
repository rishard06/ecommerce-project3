"use client";

import {
  CreditCard,
  Loader2,
  Lock,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CartQuote } from "@/features/cart/types";
import { formatCents } from "@/lib/money";
import {
  getReviewTotalsDisplay,
  toShippingInput,
  type ShippingFormState,
} from "../preamble";

interface ReviewStepProps {
  quote: CartQuote | null;
  form: ShippingFormState;
  savedAddressName: string | null;
  isQuoting: boolean;
  quoteError: string | null;
  couponCode: string;
  appliedCouponCode: string | null;
  isApplyingCoupon: boolean;
  couponError: string | null;
  isProcessing: boolean;
  error: string | null;
  onCouponCodeChange: (value: string) => void;
  onApplyCoupon: () => void;
  onBack: () => void;
  onSubmit: () => void;
}

export function ReviewStep({
  quote,
  form,
  savedAddressName,
  isQuoting,
  quoteError,
  couponCode,
  appliedCouponCode,
  isApplyingCoupon,
  couponError,
  isProcessing,
  error,
  onCouponCodeChange,
  onApplyCoupon,
  onBack,
  onSubmit,
}: ReviewStepProps) {
  const shipping = toShippingInput(form);
  const totals = quote ? getReviewTotalsDisplay(quote) : null;
  // A fully discounted order cannot be paid (no $0 Stripe session and no
  // free-order path), so block submit until the coupon is changed/removed.
  const isZeroTotal = quote !== null && quote.totalCents === 0;
  const submitDisabled =
    isQuoting || isApplyingCoupon || isProcessing || !quote || isZeroTotal;

  return (
    <section
      aria-labelledby="review-heading"
      aria-busy={isQuoting || isApplyingCoupon || isProcessing}
      className="glass-component space-y-8 p-6 shadow-sm md:p-8"
    >
      <div className="flex items-center justify-between">
        <h2
          id="review-heading"
          className="flex items-center gap-3 text-xl font-bold text-gray-primary"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-gray-primary text-sm font-bold text-background">
            2
          </span>
          Review Order
        </h2>
        <ShieldCheck className="size-6 text-accent-500" aria-hidden="true" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/40 bg-white/30 p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-primary">
            <MapPin className="size-4 text-accent-700" aria-hidden="true" />
            Ship to
          </div>
          <p className="text-sm leading-relaxed text-gray-tertiary">
            {shipping.fullName}
            <br />
            {shipping.line1}
            {shipping.line2 ? (
              <>
                <br />
                {shipping.line2}
              </>
            ) : null}
            <br />
            {shipping.city}, {shipping.region} {shipping.postalCode}
            <br />
            {shipping.country}
          </p>
          {savedAddressName ? (
            <p className="mt-3 inline-flex rounded-full border border-white/50 bg-white/60 px-3 py-1 text-xs font-semibold text-gray-secondary">
              Saved address: {savedAddressName}
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-white/40 bg-white/30 p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-primary">
            <CreditCard className="size-4 text-accent-700" aria-hidden="true" />
            Payment
          </div>
          <p className="text-sm leading-relaxed text-gray-tertiary">
            You will be redirected to Stripe&apos;s hosted checkout to enter
            your payment details. We never store your card information.
          </p>
        </div>
      </div>

      {isQuoting ? (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-white/50 bg-white/40 p-4 text-sm font-medium text-gray-tertiary"
        >
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Confirming current prices with the catalog…
        </div>
      ) : null}

      {quoteError ? (
        <p
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700"
        >
          {quoteError}
        </p>
      ) : null}

      {quote && totals ? (
        <div className="space-y-5">
          <ul className="space-y-3 border-t border-gray-primary/10 pt-5">
            {quote.items.map((item) => (
              <li
                key={item.variantId}
                className="flex items-start justify-between gap-4 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-primary">
                    {item.title}
                  </p>
                  <p className="text-xs text-gray-tertiary">
                    Qty {item.quantity} · {item.sku}
                  </p>
                </div>
                <span className="shrink-0 font-semibold tabular-nums text-gray-secondary">
                  {formatCents(item.lineTotalCents)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="space-y-2.5 border-t border-gray-primary/10 pt-5 text-sm">
            <div className="flex justify-between">
              <dt className="font-medium text-gray-tertiary">Subtotal</dt>
              <dd className="font-semibold tabular-nums text-gray-secondary">
                {totals.subtotal}
              </dd>
            </div>
            {quote.discountCents > 0 ? (
              <div className="flex justify-between">
                <dt className="font-medium text-gray-tertiary">
                  Discount
                  {quote.couponCode ? ` (${quote.couponCode})` : ""}
                </dt>
                <dd className="font-semibold tabular-nums text-green-600">
                  -{formatCents(quote.discountCents)}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt className="font-medium text-gray-tertiary">Shipping</dt>
              <dd className="font-semibold tabular-nums text-gray-secondary">
                {totals.shipping}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-gray-tertiary">Tax</dt>
              <dd className="font-semibold tabular-nums text-gray-secondary">
                {totals.tax}
              </dd>
            </div>
            <div className="flex items-center justify-between border-t border-gray-primary/10 pt-3.5">
              <dt className="text-base font-semibold text-gray-primary">
                Total
              </dt>
              <dd className="text-xl font-semibold tabular-nums tracking-tight text-gray-primary">
                {totals.total}
              </dd>
            </div>
          </dl>

          <div className="space-y-2 rounded-2xl border border-white/40 bg-white/30 p-4">
            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                onApplyCoupon();
              }}
            >
              <label
                htmlFor="checkout-coupon"
                className="block text-sm font-bold text-gray-primary"
              >
                Coupon code
              </label>
              <div className="flex gap-2">
                <Input
                  id="checkout-coupon"
                  name="couponCode"
                  value={couponCode}
                  onChange={(event) =>
                    onCouponCodeChange(event.target.value)
                  }
                  placeholder="Enter code"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  aria-invalid={couponError ? true : undefined}
                  aria-describedby={
                    couponError ? "checkout-coupon-error" : undefined
                  }
                  className="h-11 rounded-xl border-transparent bg-white/60 px-4 text-sm focus-visible:bg-white/90"
                />
                <Button
                  type="submit"
                  disabled={isApplyingCoupon || isProcessing || isQuoting}
                  aria-busy={isApplyingCoupon}
                  className="h-11 shrink-0 rounded-xl bg-gray-primary px-5 text-sm font-semibold text-background hover:bg-gray-secondary"
                >
                  {isApplyingCoupon ? (
                    <>
                      <Loader2
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />
                      Applying…
                    </>
                  ) : (
                    "Apply"
                  )}
                </Button>
              </div>
            </form>
            {appliedCouponCode ? (
              <p
                role="status"
                className="text-xs font-semibold text-green-700"
              >
                Coupon {appliedCouponCode} applied.
              </p>
            ) : null}
            {couponError ? (
              <p
                id="checkout-coupon-error"
                role="alert"
                className="text-xs font-semibold text-red-700"
              >
                {couponError}
              </p>
            ) : null}
          </div>

          <p className="rounded-xl border border-white/50 bg-white/40 px-4 py-3 text-xs leading-relaxed text-gray-tertiary">
            These totals are quoted from the catalog for this checkout. Stripe
            charges the order snapshot created when you continue.
          </p>
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700"
        >
          {error}
        </p>
      ) : null}

      {isZeroTotal ? (
        <p
          role="alert"
          className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-700"
        >
          This coupon covers the full order, so there is nothing to pay. Remove
          the coupon or lower the discount so at least $0.01 remains.
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isProcessing}
          className="h-12 flex-1 rounded-2xl border-border bg-surface-light font-semibold text-foreground hover:bg-secondary"
        >
          Back to shipping
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={submitDisabled}
          aria-busy={isProcessing}
          className="h-12 flex-[2] rounded-2xl bg-action font-semibold text-action-foreground hover:bg-action-hover"
        >
          {isProcessing ? (
            <>
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
              Redirecting to secure checkout…
            </>
          ) : (
            <>
              <Lock className="size-5" aria-hidden="true" />
              {totals
                ? `Continue to Stripe · ${totals.total}`
                : "Continue to Stripe"}
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
