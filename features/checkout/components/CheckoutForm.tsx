"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Wallet, Coins, Lock, HelpCircle, ChevronRight, Loader2, CheckCircle2, ShieldCheck, QrCode, ExternalLink, ShoppingBag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PaymentMethod, ShippingAddress, CheckoutStatus } from "../types";
import { createOrderAction } from "../actions";
import { useCartStore } from "@/lib/store/cart-store";
import { useRouter } from "next/navigation";

export function CheckoutForm() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { items, getTotalPrice, clearCart } = useCartStore();

  const [status, setStatus] = useState<CheckoutStatus>("idle");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("stripe");
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-component p-12 text-center space-y-6 shadow-xl"
      >
        <div className="w-20 h-20 bg-accent-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-accent-500/20">
          <CheckCircle2 className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-primary">Order Successful!</h2>
        <p className="text-gray-tertiary max-w-md mx-auto">
          Thank you for your purchase. Your order has been placed successfully and is being processed.
        </p>
        <Button 
          onClick={() => router.push("/products")}
          className="bg-gray-primary text-white py-6 px-10 rounded-2xl hover:scale-105 transition-transform"
        >
          Continue Shopping
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
            <label className="block text-sm font-bold text-gray-secondary">First Name</label>
            <Input 
              name="firstName"
              value={shippingInfo.firstName}
              onChange={handleInputChange}
              className="bg-white/40 border-none py-6 px-4 rounded-xl focus:ring-2 focus:ring-accent-500/50" 
              placeholder="Ryman"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-secondary">Last Name</label>
            <Input 
              name="lastName"
              value={shippingInfo.lastName}
              onChange={handleInputChange}
              className="bg-white/40 border-none py-6 px-4 rounded-xl focus:ring-2 focus:ring-accent-500/50" 
              placeholder="Alex"
              required
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="block text-sm font-bold text-gray-secondary">Address</label>
            <Input 
              name="address"
              value={shippingInfo.address}
              onChange={handleInputChange}
              className="bg-white/40 border-none py-6 px-4 rounded-xl focus:ring-2 focus:ring-accent-500/50" 
              placeholder="123 Tech Avenue, Silicon Valley"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-secondary">City</label>
            <Input 
              name="city"
              value={shippingInfo.city}
              onChange={handleInputChange}
              className="bg-white/40 border-none py-6 px-4 rounded-xl focus:ring-2 focus:ring-accent-500/50" 
              placeholder="San Francisco"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-secondary">Postal Code</label>
            <Input 
              name="postalCode"
              value={shippingInfo.postalCode}
              onChange={handleInputChange}
              className="bg-white/40 border-none py-6 px-4 rounded-xl focus:ring-2 focus:ring-accent-500/50" 
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { id: "stripe", icon: CreditCard, label: "Stripe" },
            { id: "paypal", icon: Wallet, label: "PayPal" },
            { id: "crypto", icon: Coins, label: "Crypto" },
          ].map((method) => (
            <button
              key={method.id}
              type="button"
              onClick={() => setPaymentMethod(method.id as PaymentMethod)}
              className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer ${
                paymentMethod === method.id 
                ? "border-gray-primary bg-white/60 shadow-lg scale-[1.02]" 
                : "border-white/20 bg-white/20 hover:bg-white/40"
              }`}
            >
              <method.icon className={`h-8 w-8 ${paymentMethod === method.id ? "text-gray-primary" : "text-gray-tertiary"}`} />
              <span className={`font-bold text-sm ${paymentMethod === method.id ? "text-gray-primary" : "text-gray-tertiary"}`}>
                {method.label}
              </span>
            </button>
          ))}
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
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-tertiary mb-2">Card Number</label>
                  <div className="relative">
                    <Input 
                      className="bg-white/40 border-none py-8 pl-14 pr-6 rounded-xl focus:ring-2 focus:ring-accent-500/50 font-mono tracking-widest text-lg" 
                      placeholder="4242 4242 4242 4242"
                      required
                    />
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-tertiary" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-tertiary">Expiry</label>
                    <Input 
                      className="bg-white/40 border-none py-6 px-4 rounded-xl focus:ring-2 focus:ring-accent-500/50" 
                      placeholder="12/26"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-tertiary">CVC</label>
                    <div className="relative">
                      <Input 
                        className="bg-white/40 border-none py-6 pl-4 pr-12 rounded-xl focus:ring-2 focus:ring-accent-500/50" 
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
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-2xl text-sm font-bold flex items-center gap-3"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></div>
          {error}
        </motion.div>
      )}

      <Button 
        type="submit"
        disabled={status === "processing" || status === "validating"}
        className="w-full bg-gray-primary text-white py-8 rounded-2xl font-bold text-lg hover:scale-[1.01] transition-all shadow-xl shadow-gray-primary/10 flex items-center justify-center gap-3 group relative overflow-hidden"
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
              <Lock className="h-5 w-5 group-hover:scale-110 transition-transform" />
              <span>Complete Order • ${total.toFixed(2)}</span>
              <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </motion.div>
          )}
        </AnimatePresence>
      </Button>
    </form>
  );
}
