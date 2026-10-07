"use client";
import { useState, useEffect } from "react";
import { useCartStore } from "@/lib/store/cart-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Lock, ShoppingBag } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

export function CheckoutSummary() {
  const [mounted, setMounted] = useState(false);
  const { items, getTotalPrice } = useCartStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="space-y-6 sticky top-24">
        <div className="glass-component p-6 md:p-8 shadow-sm h-96 flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full"></div>
            <div className="h-4 w-32 bg-white/20 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const subtotal = getTotalPrice();
  const shipping = 0;
  const tax = subtotal * 0.015;
  const total = subtotal + shipping + tax;

  if (items.length === 0) {
    return (
      <div className="space-y-6 sticky top-24">
        <div className="glass-component p-6 md:p-8 shadow-sm">
          <h2 className="text-xl font-bold mb-6 text-gray-primary">
            Order Summary
          </h2>
          <div className="py-12 text-center space-y-4">
            <ShoppingBag className="h-12 w-12 text-gray-tertiary mx-auto opacity-20" />
            <p className="text-gray-tertiary font-medium">Your cart is empty</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sticky top-24">
      <div className="glass-component p-6 md:p-8 shadow-sm">
        <h2 className="text-xl font-bold mb-6 text-gray-primary">
          Order Summary
        </h2>

        <div className="space-y-4 mb-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {items.map((item) => (
            <div key={item.id} className="flex gap-4 items-start">
              <div className="w-20 h-20 rounded-xl bg-white/40 flex items-center justify-center p-2 flex-shrink-0 border border-white/20">
                <Image
                  src={item.image}
                  alt={item.title}
                  width={80}
                  height={80}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-primary leading-tight mb-1 truncate">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-tertiary mb-2">
                  Qty: {item.quantity}
                </p>
                <span className="font-bold text-gray-secondary">
                  ${(item.price * item.quantity).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-8">
          <Input
            className="flex-1 bg-white/40 border-none py-6 px-4 rounded-xl text-sm focus:ring-accent-500/50"
            placeholder="Promo code"
          />
          <Button className="bg-gray-primary border-white/20 px-6 py-6 text-white font-bold rounded-xl text-sm hover:opacity-90 transition-all cursor-pointer">
            Apply
          </Button>
        </div>

        <div className="space-y-3 border-t border-white/20 pt-6 mb-8">
          <div className="flex justify-between text-gray-tertiary text-sm font-medium">
            <span>Subtotal</span>
            <span>${subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-gray-tertiary text-sm font-medium">
            <span>Shipping</span>
            <span className="text-green-500">Free</span>
          </div>
          <div className="flex justify-between text-gray-tertiary text-sm font-medium">
            <span>Tax (1.5%)</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center pt-4">
            <span className="font-bold text-xl text-gray-primary">Total</span>
            <span className="font-bold text-3xl text-gray-primary">
              ${total.toLocaleString()}
            </span>
          </div>
        </div>

        <p className="text-center text-xs text-gray-quaternary mt-4 leading-relaxed">
          By placing your order, you agree to our{" "}
          <a href="#" className="underline hover:text-gray-primary">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="underline hover:text-gray-primary">
            Privacy Policy
          </a>
          .
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm font-bold bg-green-500/10 text-green-600 px-4 py-3 rounded-xl border border-green-500/20 justify-center">
        <Lock className="h-4 w-4" />
        Encrypted & Secure Checkout
      </div>
    </div>
  );
}
