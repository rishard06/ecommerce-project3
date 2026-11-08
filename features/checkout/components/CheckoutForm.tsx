"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CreditCard, Wallet, Coins, Lock, HelpCircle, ShieldCheck, QrCode, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PaymentMethod, ShippingAddress } from "../types";
import { useCartStore } from "@/lib/store/cart-store";
import { getOrderTotals } from "@/lib/pricing";
import { formatCents } from "@/lib/money";

export function CheckoutForm() {
  const [mounted, setMounted] = useState(false);
  const getTotalPriceCents = useCartStore((state) => state.getTotalPriceCents);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("stripe");

  // Display-only total derived from the cart's integer-cent total. Checkout
  // submission is re-enabled once hosted Stripe checkout is wired up.
  const { totalCents } = getOrderTotals(getTotalPriceCents());

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

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
      {/* Migration notice: ordering is paused until checkout moves to the
          PostgreSQL catalog (server-side quotes and variant ids). */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        role="status"
        className="flex items-center gap-3 rounded-2xl border border-accent-500/25 bg-accent-500/10 p-4 text-sm font-medium text-accent-700"
      >
        <ShieldCheck className="size-5 shrink-0" aria-hidden="true" />
        Checkout will be available once the catalog migration completes.
      </motion.div>
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

      <Button
        type="submit"
        disabled
        aria-disabled="true"
        title="Checkout will be available once the catalog migration completes"
        className="group relative flex h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gray-primary text-base font-semibold text-white shadow-soft transition-colors hover:bg-gray-secondary disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Lock className="h-5 w-5" aria-hidden="true" />
        <span>Checkout unavailable • {formatCents(totalCents)}</span>
      </Button>
    </form>
  );
}
