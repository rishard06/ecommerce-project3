"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store/cart-store";
import { getOrderTotals } from "@/lib/pricing";
import { formatCents } from "@/lib/money";
import { startCheckoutAction } from "../actions";

interface ShippingFormState {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

const EMPTY_SHIPPING: ShippingFormState = {
  firstName: "",
  lastName: "",
  address: "",
  city: "",
  region: "",
  postalCode: "",
  country: "United States",
};

export function CheckoutForm() {
  const [mounted, setMounted] = useState(false);
  const items = useCartStore((state) => state.items);
  const getTotalPriceCents = useCartStore((state) => state.getTotalPriceCents);

  // Display-only total derived from the cart's integer-cent total. The server
  // re-quotes every line from PostgreSQL before charging anything.
  const { totalCents } = getOrderTotals(getTotalPriceCents());

  const [shippingInfo, setShippingInfo] =
    useState<ShippingFormState>(EMPTY_SHIPPING);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // One idempotency key per form mount: a repeated submit reuses it, so the
  // server returns the same pending order instead of reserving stock twice.
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());
  const submittingRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="glass-component p-8 h-64 bg-white/10"></div>
        <div className="glass-component p-8 h-64 bg-white/10"></div>
      </div>
    );
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setShippingInfo((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submittingRef.current) {
      return;
    }
    submittingRef.current = true;
    setIsProcessing(true);
    setError(null);

    const fullName = [shippingInfo.firstName, shippingInfo.lastName]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" ");

    try {
      const result = await startCheckoutAction({
        items: items.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        shipping: {
          fullName,
          line1: shippingInfo.address.trim(),
          city: shippingInfo.city.trim(),
          region: shippingInfo.region.trim(),
          postalCode: shippingInfo.postalCode.trim(),
          country: shippingInfo.country.trim(),
        },
        idempotencyKey: idempotencyKeyRef.current,
      });

      if (result.success) {
        // Leave the cart and order untouched; only Stripe webhooks may mark
        // the order paid.
        window.location.assign(result.url);
        return;
      }

      setError(result.error);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    }

    submittingRef.current = false;
    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Shipping Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-component p-6 md:p-8 shadow-sm"
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold flex items-center gap-3 text-gray-primary">
            <span className="w-8 h-8 rounded-full bg-gray-primary text-white flex items-center justify-center text-sm font-bold">
              1
            </span>
            Shipping Information
          </h2>
          <ShieldCheck className="text-accent-500 h-6 w-6" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label
              htmlFor="firstName"
              className="block text-sm font-bold text-gray-secondary"
            >
              First Name
            </label>
            <Input
              id="firstName"
              name="firstName"
              value={shippingInfo.firstName}
              onChange={handleInputChange}
              className="h-12 bg-white/60 border-transparent px-4 rounded-xl focus-visible:ring-2 focus-visible:ring-accent-500/40"
              placeholder="Ryman"
              autoComplete="given-name"
              required
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="lastName"
              className="block text-sm font-bold text-gray-secondary"
            >
              Last Name
            </label>
            <Input
              id="lastName"
              name="lastName"
              value={shippingInfo.lastName}
              onChange={handleInputChange}
              className="h-12 bg-white/60 border-transparent px-4 rounded-xl focus-visible:ring-2 focus-visible:ring-accent-500/40"
              placeholder="Alex"
              autoComplete="family-name"
              required
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label
              htmlFor="address"
              className="block text-sm font-bold text-gray-secondary"
            >
              Address
            </label>
            <Input
              id="address"
              name="address"
              value={shippingInfo.address}
              onChange={handleInputChange}
              className="h-12 bg-white/60 border-transparent px-4 rounded-xl focus-visible:ring-2 focus-visible:ring-accent-500/40"
              placeholder="123 Tech Avenue, Silicon Valley"
              autoComplete="street-address"
              required
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="city"
              className="block text-sm font-bold text-gray-secondary"
            >
              City
            </label>
            <Input
              id="city"
              name="city"
              value={shippingInfo.city}
              onChange={handleInputChange}
              className="h-12 bg-white/60 border-transparent px-4 rounded-xl focus-visible:ring-2 focus-visible:ring-accent-500/40"
              placeholder="San Francisco"
              autoComplete="address-level2"
              required
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="region"
              className="block text-sm font-bold text-gray-secondary"
            >
              State / Region
            </label>
            <Input
              id="region"
              name="region"
              value={shippingInfo.region}
              onChange={handleInputChange}
              className="h-12 bg-white/60 border-transparent px-4 rounded-xl focus-visible:ring-2 focus-visible:ring-accent-500/40"
              placeholder="CA"
              autoComplete="address-level1"
              required
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="postalCode"
              className="block text-sm font-bold text-gray-secondary"
            >
              Postal Code
            </label>
            <Input
              id="postalCode"
              name="postalCode"
              value={shippingInfo.postalCode}
              onChange={handleInputChange}
              className="h-12 bg-white/60 border-transparent px-4 rounded-xl focus-visible:ring-2 focus-visible:ring-accent-500/40"
              placeholder="94103"
              autoComplete="postal-code"
              required
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="country"
              className="block text-sm font-bold text-gray-secondary"
            >
              Country
            </label>
            <Input
              id="country"
              name="country"
              value={shippingInfo.country}
              onChange={handleInputChange}
              className="h-12 bg-white/60 border-transparent px-4 rounded-xl focus-visible:ring-2 focus-visible:ring-accent-500/40"
              placeholder="United States"
              autoComplete="country-name"
              required
            />
          </div>
        </div>
      </motion.div>

      {/* Hosted payment */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-component p-6 md:p-8 shadow-sm relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <h2 className="text-xl font-bold flex items-center gap-3 mb-6 relative z-10 text-gray-primary">
          <span className="w-8 h-8 rounded-full bg-gray-primary text-white flex items-center justify-center text-sm font-bold">
            2
          </span>
          Payment
        </h2>

        <div className="relative z-10 flex items-start gap-4 rounded-2xl border border-white/40 bg-white/30 p-6">
          <div className="rounded-full bg-accent-500/15 p-3">
            <Lock className="size-5 text-accent-700" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-gray-primary">
              Secure payment with Stripe
            </h3>
            <p className="text-sm leading-relaxed text-gray-tertiary">
              You will be redirected to Stripe&apos;s hosted checkout to enter
              your payment details. We never store your card information.
            </p>
          </div>
        </div>
      </motion.div>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700"
        >
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={isProcessing || items.length === 0}
        aria-busy={isProcessing}
        className="group relative flex h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gray-primary text-base font-semibold text-white shadow-soft transition-colors hover:bg-gray-secondary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span>Redirecting to secure checkout…</span>
          </>
        ) : (
          <>
            <Lock className="h-5 w-5" aria-hidden="true" />
            <span>
              {items.length === 0
                ? "Your cart is empty"
                : `Continue to payment • ${formatCents(totalCents)}`}
            </span>
          </>
        )}
      </Button>
    </form>
  );
}
