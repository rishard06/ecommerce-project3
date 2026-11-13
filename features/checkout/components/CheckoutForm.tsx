"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/store/cart-store";
import { listAddresses } from "@/features/account/address-actions";
import type { AddressRow } from "@/features/account/types";
import type { CartQuote } from "@/features/cart/types";
import { quoteCheckoutAction, startCheckoutAction } from "../actions";
import {
  EMPTY_SHIPPING_FORM,
  SHIPPING_STORAGE_KEY,
  createCheckoutAttempt,
  isShippingFormComplete,
  parseStoredShippingForm,
  shippingFormFromSavedAddress,
  toShippingInput,
  type ShippingFormState,
} from "../preamble";
import type { CheckoutStep } from "../types";
import { ReviewStep } from "./ReviewStep";
import { ShippingStep } from "./ShippingStep";

interface CheckoutFormProps {
  step: CheckoutStep;
}

export function CheckoutForm({ step }: CheckoutFormProps) {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const items = useCartStore((state) => state.items);

  // Restore the in-progress attempt after a full page navigation (including
  // browser Back from Stripe). The server-rendered skeleton means the restored
  // form never causes a hydration mismatch.
  const [shippingForm, setShippingForm] = useState<ShippingFormState>(() => {
    if (typeof window === "undefined") {
      return EMPTY_SHIPPING_FORM;
    }

    try {
      return (
        parseStoredShippingForm(
          window.sessionStorage.getItem(SHIPPING_STORAGE_KEY),
        ) ?? EMPTY_SHIPPING_FORM
      );
    } catch {
      return EMPTY_SHIPPING_FORM;
    }
  });
  const [savedAddresses, setSavedAddresses] = useState<AddressRow[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One attempt, one idempotency key. The guard also blocks a second click
  // while the first submit is still in flight.
  const [attempt] = useState(() => createCheckoutAttempt());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        SHIPPING_STORAGE_KEY,
        JSON.stringify(shippingForm),
      );
    } catch {
      // Storage can be unavailable in private modes; checkout still works.
    }
  }, [shippingForm]);

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

  // A review URL without a complete shipping form is not a valid state. Send
  // the shopper back to shipping instead of reviewing an empty address.
  useEffect(() => {
    if (mounted && step === "review" && !isShippingFormComplete(shippingForm)) {
      router.replace("/checkout?step=shipping");
    }
  }, [mounted, step, shippingForm, router]);

  // Review totals always come from the server quote, never from the persisted
  // browser cart. Re-quote whenever the step or cart lines change.
  useEffect(() => {
    if (step !== "review" || items.length === 0) {
      return;
    }

    let active = true;
    setQuote(null);
    setQuoteError(null);
    setIsQuoting(true);

    quoteCheckoutAction(
      items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      })),
    )
      .then((result) => {
        if (!active) {
          return;
        }

        if (result.success) {
          setQuote(result.quote);
        } else {
          setQuoteError(result.error);
        }
      })
      .catch(() => {
        if (active) {
          setQuoteError(
            "Unable to confirm current prices. Please try again.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setIsQuoting(false);
        }
      });

    return () => {
      active = false;
    };
  }, [step, items]);

  if (!mounted) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="glass-component h-64 bg-white/10 p-8" />
        <div className="glass-component h-64 bg-white/10 p-8" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="glass-component space-y-5 p-8 text-center shadow-panel md:p-12">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-gray-primary/10">
          <ShoppingBag
            className="size-8 text-gray-quaternary"
            aria-hidden="true"
          />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-primary">
            Your cart is empty
          </h2>
          <p className="text-gray-tertiary">
            Add a product before starting checkout.
          </p>
        </div>
        <Link
          href="/products"
          className="inline-flex h-12 items-center justify-center rounded-full bg-gray-primary px-8 text-sm font-semibold text-white transition-colors hover:bg-gray-secondary"
        >
          Browse products
        </Link>
      </div>
    );
  }

  const handleShippingChange = (
    field: keyof ShippingFormState,
    value: string,
  ) => {
    setSelectedAddressId("");
    setShippingForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleSelectSavedAddress = (addressId: string) => {
    setSelectedAddressId(addressId);
    const address = savedAddresses.find(
      (candidate) => candidate.id === addressId,
    );

    if (address) {
      setShippingForm(shippingFormFromSavedAddress(address));
    }
  };

  const goToStep = (next: CheckoutStep) => {
    setError(null);
    router.push(`/checkout?step=${next}`, { scroll: false });
  };

  const handleShippingNext = () => {
    if (!isShippingFormComplete(shippingForm)) {
      setError("Please complete your shipping details.");
      return;
    }

    goToStep("review");
  };

  const handlePlaceOrder = async () => {
    if (isQuoting || !quote) {
      return;
    }

    // begin() returns false for a repeated click while the first submit is
    // still pending. The key stays the same for retries of this attempt.
    if (!attempt.begin()) {
      return;
    }

    setError(null);
    setIsProcessing(true);

    try {
      const result = await startCheckoutAction({
        items: items.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        shipping: toShippingInput(shippingForm),
        idempotencyKey: attempt.idempotencyKey,
      });

      if (result.success) {
        // Only Stripe webhooks may mark an order paid. This is a handoff to
        // the hosted payment page, not proof of payment.
        window.location.assign(result.url);
        return;
      }

      setError(result.error);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    }

    // Keep the guard closed on success while the browser navigates away.
    attempt.finish();
    setIsProcessing(false);
  };

  if (step === "review") {
    const savedAddressName =
      savedAddresses.find((address) => address.id === selectedAddressId)
        ?.fullName ?? null;

    return (
      <ReviewStep
        quote={quote}
        form={shippingForm}
        savedAddressName={savedAddressName}
        isQuoting={isQuoting}
        quoteError={quoteError}
        isProcessing={isProcessing}
        error={error}
        onBack={() => goToStep("shipping")}
        onSubmit={handlePlaceOrder}
      />
    );
  }

  return (
    <ShippingStep
      value={shippingForm}
      savedAddresses={savedAddresses}
      selectedAddressId={selectedAddressId}
      error={error}
      onChange={handleShippingChange}
      onSelectSavedAddress={handleSelectSavedAddress}
      onNext={handleShippingNext}
    />
  );
}
