"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CreditCard, Wallet, Coins, Lock, HelpCircle, ChevronRight, Loader2, CheckCircle2, ShieldCheck, QrCode, ExternalLink, ShoppingBag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PaymentMethod, ShippingAddress, CheckoutStatus } from "../types";
import { createOrderAction } from "../actions";
import { useCartStore } from "@/lib/store/cart-store";
import { useRouter } from "next/navigation";
import { getOrderTotals } from "@/lib/pricing";

export function CheckoutForm() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { items, getTotalPrice, clearCart } = useCartStore();

  const [status, setStatus] = useState<CheckoutStatus>("idle");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("stripe");
  const [error, setError] = useState<string | null>(null);

  // The server re-validates prices; this total is only for display.
  const { total } = getOrderTotals(getTotalPrice());

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
      <div className="space-y-8 animate-pulse">
        <div className="glass-component p-8 h-64 bg-white/10"></div>
        <div className="glass-component p-8 h-64 bg-white/10"></div>
      </div>
    );
  }
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setShippingInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus("validating");

    // Validate shipping info
    if (!shippingInfo.address || !shippingInfo.city || !shippingInfo.postalCode) {
      setError("Please fill in all shipping details.");
      setStatus("error");
      return;
    }

    setStatus("processing");

    // SECURITY: Only send product IDs and quantities to server
    // Server will fetch and validate prices from DummyJSON API
    const cartItems = items.map(item => ({
      id: item.id,
      quantity: item.quantity
    }));

    const result = await createOrderAction(shippingInfo, paymentMethod, cartItems);

    if (result.success) {
      setStatus("success");
      setTimeout(() => {
        clearCart();
        // router.push(`/checkout/success?id=${result.orderId}`);
        // For now, just show success state in UI
      }, 2000);
    } else {
      setError(result.error || "Payment failed. Please try again.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        role="status"
        aria-live="polite"
        className="glass-component space-y-6 p-10 text-center shadow-panel md:p-12"
      >
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent-500 shadow-soft">
          <CheckCircle2 className="size-8 text-gray-primary" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-gray-primary md:text-3xl">
          Order placed
        </h2>
        <p className="mx-auto max-w-md leading-relaxed text-gray-tertiary">
          Thank you for your purchase. Your order is being prepared and you&apos;ll
          receive a confirmation shortly.
        </p>
        <Button
          onClick={() => router.push("/products")}
          className="h-12 rounded-full bg-gray-primary px-8 font-semibold text-white hover:bg-gray-secondary"
        >
          Continue shopping
        </Button>
      </motion.div>
    );
  }

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
            <span className="w-8 h-8 rounded-full bg-gray-primary text-white flex items-center justify-center text-sm font-bold">1</span>
            Shipping Information
          </h2>
          <ShieldCheck className="text-accent-500 h-6 w-6" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="firstName" className="block text-sm font-bold text-gray-secondary">First Name</label>
            <Input
              id="firstName"
              name="firstName"
              value={shippingInfo.firstName}
              onChange={handleInputChange}
              className="h-12 bg-white/60 border-transparent px-4 rounded-xl focus-visible:ring-2 focus-visible:ring-accent-500/40"
              placeholder="Ryman"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="lastName" className="block text-sm font-bold text-gray-secondary">Last Name</label>
            <Input
              id="lastName"
              name="lastName"
              value={shippingInfo.lastName}
              onChange={handleInputChange}
              className="h-12 bg-white/60 border-transparent px-4 rounded-xl focus-visible:ring-2 focus-visible:ring-accent-500/40"
              placeholder="Alex"
              required
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label htmlFor="address" className="block text-sm font-bold text-gray-secondary">Address</label>
            <Input
              id="address"
              name="address"
              value={shippingInfo.address}
              onChange={handleInputChange}
              className="h-12 bg-white/60 border-transparent px-4 rounded-xl focus-visible:ring-2 focus-visible:ring-accent-500/40"
              placeholder="123 Tech Avenue, Silicon Valley"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="city" className="block text-sm font-bold text-gray-secondary">City</label>
            <Input
              id="city"
              name="city"
              value={shippingInfo.city}
              onChange={handleInputChange}
              className="h-12 bg-white/60 border-transparent px-4 rounded-xl focus-visible:ring-2 focus-visible:ring-accent-500/40"
              placeholder="San Francisco"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="postalCode" className="block text-sm font-bold text-gray-secondary">Postal Code</label>
            <Input
              id="postalCode"
              name="postalCode"
              value={shippingInfo.postalCode}
              onChange={handleInputChange}
              className="h-12 bg-white/60 border-transparent px-4 rounded-xl focus-visible:ring-2 focus-visible:ring-accent-500/40"
              placeholder="94103"
              required
            />
          </div>
        </div>
      </motion.div>

      {/* Payment Method */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-component p-6 md:p-8 shadow-sm relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <h2 className="text-xl font-bold flex items-center gap-3 mb-8 relative z-10 text-gray-primary">
          <span className="w-8 h-8 rounded-full bg-gray-primary text-white flex items-center justify-center text-sm font-bold">2</span>
          Payment Method
        </h2>

        <div
          role="radiogroup"
          aria-label="Payment method"
          className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-3"
        >
          {[
            { id: "stripe", icon: CreditCard, label: "Stripe" },
            { id: "paypal", icon: Wallet, label: "PayPal" },
            { id: "crypto", icon: Coins, label: "Crypto" },
          ].map((method) => {
            const isSelected = paymentMethod === method.id;
            return (
              <button
                key={method.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                className={`flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2.5 rounded-2xl border-2 p-4 transition-[background-color,border-color,box-shadow] duration-200 ease-out-quart ${
                  isSelected
                    ? "border-accent-600 bg-white/70 shadow-soft"
                    : "border-gray-primary/10 bg-white/30 hover:border-gray-primary/20 hover:bg-white/50"
                }`}
              >
                <method.icon
                  className={`size-6 ${isSelected ? "text-accent-700" : "text-gray-tertiary"}`}
                  aria-hidden="true"
                />
                <span
                  className={`text-sm font-semibold ${
                    isSelected ? "text-gray-primary" : "text-gray-tertiary"
                  }`}
                >
                  {method.label}
                </span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={paymentMethod}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="bg-white/30 rounded-2xl p-8 border border-white/40 space-y-6"
          >
            {paymentMethod === "stripe" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-primary">Credit Card via Stripe</h3>
                  <div className="flex gap-2">
                    <span className="text-[10px] bg-accent-500/20 text-accent-700 px-2 py-1 rounded font-bold tracking-wider">TEST MODE</span>
                  </div>
                </div>

                <div className="relative">
                  <label htmlFor="card-number" className="block text-[10px] uppercase tracking-widest font-bold text-gray-tertiary mb-2">Card Number</label>
                  <div className="relative">
                    <Input
                      id="card-number"
                      className="h-14 bg-white/60 border-transparent pl-14 pr-6 rounded-xl focus-visible:ring-2 focus-visible:ring-accent-500/40 font-mono tracking-widest text-lg"
                      placeholder="4242 4242 4242 4242"
                      required
                    />
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-tertiary" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="expiry" className="block text-[10px] uppercase tracking-widest font-bold text-gray-tertiary">Expiry</label>
                    <Input
                      id="expiry"
                      className="h-12 bg-white/60 border-transparent px-4 rounded-xl focus-visible:ring-2 focus-visible:ring-accent-500/40"
                      placeholder="12/26"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="cvc" className="block text-[10px] uppercase tracking-widest font-bold text-gray-tertiary">CVC</label>
                    <div className="relative">
                      <Input
                        id="cvc"
                        className="h-12 bg-white/60 border-transparent pl-4 pr-12 rounded-xl focus-visible:ring-2 focus-visible:ring-accent-500/40"
                        placeholder="123"
                        required
                      />
                      <HelpCircle className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-tertiary cursor-help" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === "paypal" && (
              <div className="space-y-8 py-4 text-center">
                <div className="bg-white/40 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/60">
                  <Wallet className="h-10 w-10 text-gray-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-xl text-gray-primary">PayPal Checkout</h3>
                  <p className="text-sm text-gray-tertiary">You will be redirected to PayPal sandbox to complete your purchase securely.</p>
                </div>
                <div className="bg-[#ffc439] hover:bg-[#f4bb3a] transition-colors py-4 px-6 rounded-full flex items-center justify-center gap-3 cursor-pointer shadow-md group">
                  <span className="font-bold text-blue-900 text-lg">PayPal</span>
                  <ExternalLink className="h-5 w-5 text-blue-900 group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-[10px] text-gray-tertiary uppercase tracking-tighter">Safe & Encrypted Sandbox Payment</p>
              </div>
            )}

            {paymentMethod === "crypto" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-primary">Crypto Payment (USDT/BTC)</h3>
                  <span className="text-[10px] bg-accent-500/20 text-accent-700 px-2 py-1 rounded font-bold tracking-wider">NETWORK: ETHEREUM</span>
                </div>

                <div className="flex flex-col md:flex-row gap-8 items-center bg-white/20 p-6 rounded-2xl border border-white/40">
                  <div className="bg-white p-3 rounded-xl shadow-lg">
                    <QrCode className="h-32 w-32 text-gray-primary" />
                  </div>
                  <div className="space-y-4 flex-1 w-full">
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-tertiary">Wallet Address</label>
                      <div className="flex items-center gap-2 bg-white/40 p-3 rounded-lg border border-white/40">
                        <code className="text-xs font-mono break-all text-gray-primary">0x71C7656EC7ab88b098defB751B7401B5f6d8976F</code>
                      </div>
                    </div>
                    <p className="text-xs text-gray-tertiary flex items-center gap-2">
                      <Lock className="h-3 w-3" />
                      Send only USDT to this Ethereum network address.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
          className="flex items-center gap-3 rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm font-medium text-destructive"
        >
          <div className="size-1.5 shrink-0 rounded-full bg-destructive" aria-hidden="true"></div>
          {error}
        </motion.div>
      )}

      <Button
        type="submit"
        disabled={status === "processing" || status === "validating"}
        className="group relative flex h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gray-primary text-base font-semibold text-white shadow-soft transition-colors hover:bg-gray-secondary"
      >
        <AnimatePresence mode="wait">
          {status === "processing" || status === "validating" ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>{status === "validating" ? "Validating Info..." : "Processing Payment..."}</span>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <Lock className="h-5 w-5 transition-transform" aria-hidden="true" />
              <span>Complete Order • ${total.toFixed(2)}</span>
              <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </motion.div>
          )}
        </AnimatePresence>
      </Button>
    </form>
  );
}
