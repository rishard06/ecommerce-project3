"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CreditCard, Wallet, Coins, Lock, HelpCircle, ExternalLink, QrCode } from "lucide-react";
import { getOrderTotals, COUPONS, type ShippingMethod } from "@/lib/pricing";
import type { PaymentMethod } from "../types";

interface PaymentStepProps {
  method: PaymentMethod;
  shippingMethod: ShippingMethod;
  subtotal: number;
  coupon: string;
  onCouponChange: (coupon: string) => void;
  onMethodChange: (method: PaymentMethod) => void;
  onBack: () => void;
  onNext: () => void;
}

const PAYMENT_METHODS = [
  { id: "stripe", label: "Stripe", icon: CreditCard },
  { id: "paypal", label: "PayPal", icon: Wallet },
  { id: "crypto", label: "Crypto", icon: Coins },
] as const satisfies ReadonlyArray<{
  id: PaymentMethod;
  label: string;
  icon: typeof CreditCard;
}>;

export function PaymentStep({
  method,
  shippingMethod,
  subtotal,
  coupon,
  onCouponChange,
  onMethodChange,
  onBack,
  onNext,
}: PaymentStepProps) {
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [expiry, setExpiry] = useState("12/26");
  const [cvc, setCvc] = useState("123");
  const [couponError, setCouponError] = useState<string | null>(null);

  const { total } = getOrderTotals(
    subtotal,
    shippingMethod,
    coupon.trim() ? coupon.trim().toUpperCase() : undefined
  );

  const handleCouponChange = (value: string) => {
    onCouponChange(value);
    const normalized = value.trim().toUpperCase();
    setCouponError(
      normalized && !(normalized in COUPONS) ? "That code is not valid. Totals are unchanged." : null
    );
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onNext();
      }}
      className="glass-component relative space-y-8 overflow-hidden p-6 shadow-sm md:p-8"
    >
      <div className="pointer-events-none absolute -mr-16 -mt-16 top-0 right-0 size-64 rounded-full bg-accent-500/10 blur-3xl" />

      <h2 className="relative z-10 flex items-center gap-3 text-xl font-bold text-gray-primary">
        <span className="flex size-8 items-center justify-center rounded-full bg-gray-primary text-sm font-bold text-white">
          2
        </span>
        Payment Method
        <span className="ml-auto rounded bg-accent-500/20 px-2 py-1 text-[10px] font-bold tracking-wider text-accent-700">
          TEST MODE
        </span>
      </h2>

      <div
        role="radiogroup"
        aria-label="Payment method"
        className="grid grid-cols-1 gap-3 md:grid-cols-3"
      >
        {PAYMENT_METHODS.map((payment) => {
          const isSelected = method === payment.id;

          return (
            <button
              key={payment.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onMethodChange(payment.id)}
              className={`flex min-h-24 flex-col items-center justify-center gap-2.5 rounded-2xl border-2 p-4 transition-[background-color,border-color,box-shadow] duration-200 ease-out-quart ${
                isSelected
                  ? "border-accent-600 bg-white/70 shadow-soft"
                  : "border-gray-primary/10 bg-white/30 hover:border-gray-primary/20 hover:bg-white/50"
              }`}
            >
              <payment.icon
                className={`size-6 ${isSelected ? "text-accent-700" : "text-gray-tertiary"}`}
                aria-hidden="true"
              />
              <span
                className={`text-sm font-semibold ${
                  isSelected ? "text-gray-primary" : "text-gray-tertiary"
                }`}
              >
                {payment.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-6 rounded-2xl border border-white/40 bg-white/30 p-6 md:p-8">
        {method === "stripe" && (
          <>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-primary">Credit Card via Stripe</h3>
              <span className="text-xs font-semibold text-gray-tertiary">Sandbox only</span>
            </div>

            <div className="relative">
              <label
                htmlFor="card-number"
                className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-tertiary"
              >
                Card Number
              </label>
              <div className="relative">
                <Input
                  id="card-number"
                  value={cardNumber}
                  onChange={(event) => setCardNumber(event.target.value)}
                  className="h-14 rounded-xl border-transparent bg-white/60 pl-14 pr-6 font-mono text-lg tracking-widest focus-visible:ring-2 focus-visible:ring-accent-500/40"
                  placeholder="4242 4242 4242 4242"
                  autoComplete="off"
                  required
                />
                <CreditCard className="absolute left-4 top-1/2 size-6 -translate-y-1/2 text-gray-tertiary" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label
                  htmlFor="expiry"
                  className="block text-[10px] font-bold uppercase tracking-widest text-gray-tertiary"
                >
                  Expiry
                </label>
                <Input
                  id="expiry"
                  value={expiry}
                  onChange={(event) => setExpiry(event.target.value)}
                  className="h-12 rounded-xl border-transparent bg-white/60 px-4 focus-visible:ring-2 focus-visible:ring-accent-500/40"
                  placeholder="12/26"
                  autoComplete="off"
                  required
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="cvc"
                  className="block text-[10px] font-bold uppercase tracking-widest text-gray-tertiary"
                >
                  CVC
                </label>
                <div className="relative">
                  <Input
                    id="cvc"
                    value={cvc}
                    onChange={(event) => setCvc(event.target.value)}
                    className="h-12 rounded-xl border-transparent bg-white/60 pl-4 pr-12 focus-visible:ring-2 focus-visible:ring-accent-500/40"
                    placeholder="123"
                    autoComplete="off"
                    required
                  />
                  <HelpCircle className="absolute right-4 top-1/2 size-5 -translate-y-1/2 cursor-help text-gray-tertiary" />
                </div>
              </div>
            </div>
          </>
        )}

        {method === "paypal" && (
          <div className="space-y-5 py-4 text-center">
            <Wallet className="mx-auto size-10 text-gray-primary" aria-hidden="true" />
            <p className="text-sm text-gray-tertiary">
              You will be redirected to the PayPal sandbox to complete this simulated purchase.
            </p>
            <div className="flex items-center justify-center gap-3 rounded-full bg-accent-500/20 px-6 py-4 font-bold text-gray-primary">
              PayPal
              <ExternalLink className="size-5" aria-hidden="true" />
            </div>
          </div>
        )}

        {method === "crypto" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-primary">Crypto Payment</h3>
              <span className="rounded bg-accent-500/20 px-2 py-1 text-[10px] font-bold tracking-wider text-accent-700">
                NETWORK: ETHEREUM
              </span>
            </div>
            <div className="flex flex-col items-center gap-6 rounded-2xl border border-white/40 bg-white/20 p-6 md:flex-row">
              <div className="rounded-xl bg-white p-3 shadow-soft">
                <QrCode className="size-28 text-gray-primary" aria-hidden="true" />
              </div>
              <div className="w-full space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-tertiary">
                  Wallet Address
                </p>
                <code className="block break-all rounded-lg border border-white/40 bg-white/40 p-3 font-mono text-xs text-gray-primary">
                  0x71C7656EC7ab88b098defB751B7401B5f6d8976F
                </code>
                <p className="flex items-center gap-2 text-xs text-gray-tertiary">
                  <Lock className="size-3" aria-hidden="true" />
                  Send only USDT on the Ethereum network.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2 rounded-2xl border border-white/40 bg-white/30 p-6">
        <label
          htmlFor="coupon"
          className="block text-[10px] font-bold uppercase tracking-widest text-gray-tertiary"
        >
          Promo code (try DEMO10)
        </label>
        <Input
          id="coupon"
          value={coupon}
          onChange={(event) => handleCouponChange(event.target.value)}
          className="h-12 rounded-xl border-transparent bg-white/60 px-4 uppercase placeholder:normal-case placeholder:text-gray-quaternary focus-visible:ring-2 focus-visible:ring-accent-500/40"
          placeholder="Enter code"
          autoComplete="off"
        />
        {couponError ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {couponError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="h-12 flex-1 rounded-2xl border-gray-primary/15 bg-white/40 font-semibold text-gray-primary hover:bg-white/70"
        >
          Back to shipping
        </Button>
        <Button
          type="submit"
          className="h-12 flex-[2] rounded-2xl bg-gray-primary font-semibold text-white hover:bg-gray-secondary"
        >
          Review order &middot; ${total.toFixed(2)}
        </Button>
      </div>
    </form>
  );
}
