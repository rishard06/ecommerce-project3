"use client";
import { CheckoutForm } from "@/features/checkout/components/CheckoutForm";
import { CheckoutSummary } from "@/features/checkout/components/CheckoutSummary";
import { ChevronRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function CheckoutPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-16">
      {/* Header section */}
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-2"
        >
          <nav className="flex items-center gap-2 text-sm font-bold text-gray-tertiary mb-2">
            <Link href="/cart" className="hover:text-gray-primary transition-colors">Cart</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-primary">Checkout</span>
          </nav>
          <h1 className="text-4xl md:text-5xl font-black text-gray-primary tracking-tight">Secure Checkout</h1>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 bg-white/30 backdrop-blur-xl px-6 py-3 rounded-full border border-white/40 shadow-sm"
        >
          <div className="bg-green-500 rounded-full p-1">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <span className="text-sm font-bold text-gray-primary tracking-wide">Encrypted & Secure</span>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Forms */}
        <div className="lg:col-span-8">
          <CheckoutForm />
        </div>

        {/* Right Column: Summary */}
        <div className="lg:col-span-4">
          <CheckoutSummary />
        </div>
      </div>
    </div>
  );
}
