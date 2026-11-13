"use client";

import {
  CreditCard,
  Loader2,
  Lock,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  isProcessing: boolean;
  error: string | null;
  onBack: () => void;
  onSubmit: () => void;
}

export function ReviewStep({
  quote,
  form,
  savedAddressName,
  isQuoting,
  quoteError,
  isProcessing,
  error,
  onBack,
  onSubmit,
}: ReviewStepProps) {
  const shipping = toShippingInput(form);
  const totals = quote ? getReviewTotalsDisplay(quote) : null;
  const submitDisabled = isQuoting || isProcessing || !quote;

  return (
    <section
      aria-labelledby="review-heading"
      aria-busy={isQuoting || isProcessing}
      className="glass-component space-y-8 p-6 shadow-sm md:p-8"
    >
      <div className="flex items-center justify-between">
        <h2
          id="review-heading"
          className="flex items-center gap-3 text-xl font-bold text-gray-primary"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-gray-primary text-sm font-bold text-white">
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

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isProcessing}
          className="h-12 flex-1 rounded-2xl border-gray-primary/15 bg-white/40 font-semibold text-gray-primary hover:bg-white/70"
        >
          Back to shipping
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={submitDisabled}
          aria-busy={isProcessing}
          className="h-12 flex-[2] rounded-2xl bg-gray-primary font-semibold text-white hover:bg-gray-secondary"
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
