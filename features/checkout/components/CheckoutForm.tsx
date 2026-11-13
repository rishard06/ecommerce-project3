"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store/cart-store";
import { getOrderTotals } from "@/lib/pricing";
import { formatCents } from "@/lib/money";
import { listAddresses } from "@/features/account/address-actions";
import type { AddressRow } from "@/features/account/types";
import { startCheckoutAction } from "../actions";
import type { ShippingInput } from "../types";

const EMPTY_SHIPPING: Required<ShippingInput> = {
  fullName: "",
  line1: "",
  line2: "",
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
    useState<Required<ShippingInput>>(EMPTY_SHIPPING);
  const [savedAddresses, setSavedAddresses] = useState<AddressRow[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // One idempotency key per form mount: a repeated submit reuses it, so the
  // server returns the same pending order instead of reserving stock twice.
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());
  const submittingRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Saved addresses are a prefill convenience only. If the shopper is signed
  // out or the address book is unavailable, manual shipping entry still works.
  useEffect(() => {
    let active = true;

    listAddresses()
      .then((addresses) => {
        if (active) {
          setSavedAddresses(addresses);
        }
      })
      .catch(() => {
        // Manual entry is the fallback; no checkout-blocking error here.
      });

    return () => {
      active = false;
    };
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
    setSelectedAddressId("");
    setShippingInfo((previous) => ({ ...previous, [name]: value }));
  };

  /**
   * Prefill-only picker: selecting an address copies its ShippingInput fields
   * into the form. It never submits, and it never writes back to the book.
   */
  const handleSavedAddressChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const address = savedAddresses.find(
      (candidate) => candidate.id === event.target.value,
    );

    setSelectedAddressId(event.target.value);

    if (!address) {
      return;
    }

    setShippingInfo({
      fullName: address.fullName,
      line1: address.line1,
      line2: address.line2 ?? "",
      city: address.city,
      region: address.region,
      postalCode: address.postalCode,
      country: address.country,
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submittingRef.current) {
      return;
    }
    submittingRef.current = true;
    setIsProcessing(true);
    setError(null);

    try {
      const result = await startCheckoutAction({
        items: items.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        shipping: {
          fullName: shippingInfo.fullName.trim(),
          line1: shippingInfo.line1.trim(),
          line2: shippingInfo.line2.trim() || undefined,
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

        {savedAddresses.length > 0 ? (
          <div className="mb-6 space-y-2">
            <label
              htmlFor="savedAddress"
              className="block text-sm font-bold text-gray-secondary"
            >
              Use a saved address
            </label>
            <select
              id="savedAddress"
              value={selectedAddressId}
              onChange={handleSavedAddressChange}
              className="h-12 w-full rounded-xl border-transparent bg-white/60 px-4 text-gray-primary focus-visible:ring-2 focus-visible:ring-accent-500/40"
            >
              <option value="">Enter a new address</option>
              {savedAddresses.map((address) => (
                <option key={address.id} value={address.id}>
                  {address.fullName} — {address.line1}, {address.city}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-tertiary">
              Selecting an address only fills the fields below. Checkout never
              writes back to your address book.
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2 space-y-2">
            <label
              htmlFor="fullName"
              className="block text-sm font-bold text-gray-secondary"
            >
              Full Name
            </label>
            <Input
              id="fullName"
              name="fullName"
              value={shippingInfo.fullName}
              onChange={handleInputChange}
              className="h-12 bg-white/60 border-transparent px-4 rounded-xl focus-visible:ring-2 focus-visible:ring-accent-500/40"
              placeholder="Ryman Alex"
              autoComplete="name"
              required
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label
              htmlFor="line1"
              className="block text-sm font-bold text-gray-secondary"
            >
              Address Line 1
            </label>
            <Input
              id="line1"
              name="line1"
              value={shippingInfo.line1}
              onChange={handleInputChange}
              className="h-12 bg-white/60 border-transparent px-4 rounded-xl focus-visible:ring-2 focus-visible:ring-accent-500/40"
              placeholder="123 Tech Avenue"
              autoComplete="address-line1"
              required
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label
              htmlFor="line2"
              className="block text-sm font-bold text-gray-secondary"
            >
              Address Line 2{" "}
              <span className="font-medium text-gray-tertiary">(optional)</span>
            </label>
            <Input
              id="line2"
              name="line2"
              value={shippingInfo.line2}
              onChange={handleInputChange}
              className="h-12 bg-white/60 border-transparent px-4 rounded-xl focus-visible:ring-2 focus-visible:ring-accent-500/40"
              placeholder="Apartment, suite, unit"
              autoComplete="address-line2"
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
