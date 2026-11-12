"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/store/cart-store";
import type { ShippingMethod } from "@/lib/pricing";
import { createOrderAction } from "../actions";
import type {
  CheckoutStatus,
  CheckoutStep,
  PaymentMethod,
  ShippingAddress,
} from "../types";
import { PaymentStep } from "./PaymentStep";
import { ReviewStep } from "./ReviewStep";
import { ShippingStep } from "./ShippingStep";

interface CheckoutFormProps {
  step?: CheckoutStep;
}

const REQUIRED_SHIPPING_FIELDS: Array<keyof ShippingAddress> = [
  "firstName",
  "lastName",
  "address",
  "city",
  "postalCode",
];

export function CheckoutForm({ step = "shipping" }: CheckoutFormProps) {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { items, getTotalPrice } = useCartStore();

  const [status, setStatus] = useState<CheckoutStatus>("idle");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("stripe");
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("standard");
  const [coupon, setCoupon] = useState("");
  // One key per wizard mount: retries and double-clicks reuse it, so the
  // server returns the first order instead of creating a duplicate.
  const [idempotencyKey] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  const [error, setError] = useState<string | null>(null);

  const [shippingInfo, setShippingInfo] = useState<ShippingAddress>({
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    postalCode: "",
    country: "United States",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

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
          <ShoppingBag className="size-8 text-gray-quaternary" aria-hidden="true" />
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

  const subtotal = getTotalPrice();

  const goToStep = (next: CheckoutStep) => {
    setError(null);
    setStatus("idle");
    router.push(next === "shipping" ? "/checkout" : `/checkout?step=${next}`);
  };

  const handleShippingChange = (field: keyof ShippingAddress, value: string) => {
    setShippingInfo((previous) => ({ ...previous, [field]: value }));
  };

  const handlePlaceOrder = async () => {
    setError(null);

    if (REQUIRED_SHIPPING_FIELDS.some((field) => !shippingInfo[field].trim())) {
      setError("Please complete your shipping details.");
      setStatus("error");
      router.push("/checkout?step=shipping");
      return;
    }

    setStatus("validating");

    const cartItems = items.map((item) => ({ id: item.id, quantity: item.quantity }));

    setStatus("processing");
    const result = await createOrderAction({
      shipping: shippingInfo,
      method: shippingMethod,
      payment: { cardLast4: "4242", method: paymentMethod },
      coupon: coupon.trim() ? coupon.trim().toUpperCase() : undefined,
      idempotencyKey,
      items: cartItems,
    });

    if (result.success && result.orderId) {
      setStatus("success");
      router.push(`/checkout/success?id=${encodeURIComponent(result.orderId)}`);
      return;
    }

    setError(result.error || "Payment failed. Please try again.");
    setStatus("error");
  };

  if (step === "payment") {
    return (
      <PaymentStep
        method={paymentMethod}
        shippingMethod={shippingMethod}
        subtotal={subtotal}
        coupon={coupon}
        onCouponChange={setCoupon}
        onMethodChange={setPaymentMethod}
        onBack={() => goToStep("shipping")}
        onNext={() => goToStep("review")}
      />
    );
  }

  if (step === "review") {
    return (
      <ReviewStep
        shipping={shippingInfo}
        shippingMethod={shippingMethod}
        paymentMethod={paymentMethod}
        subtotal={subtotal}
        coupon={coupon.trim() ? coupon.trim().toUpperCase() : undefined}
        status={status}
        error={error}
        onBack={() => goToStep("payment")}
        onSubmit={handlePlaceOrder}
      />
    );
  }

  return (
    <ShippingStep
      value={shippingInfo}
      method={shippingMethod}
      onChange={handleShippingChange}
      onMethodChange={setShippingMethod}
      onNext={() => goToStep("payment")}
    />
  );
}
