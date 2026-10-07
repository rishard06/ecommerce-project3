"use client";
import Link from "next/link";
import { ArrowRight, CreditCard, Wallet, Landmark } from "lucide-react";
import { useCartStore } from "@/lib/store/cart-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function OrderSummary() {
  const { getTotalPrice } = useCartStore();
  const subtotal = getTotalPrice();
  const shipping = 0; // Free shipping in the prompt
  const tax = subtotal * 0.015; // Roughly 1.5% tax for estimation
  const total = subtotal + shipping + tax;

  return (
    <div className="space-y-6">
      <div className="glass-component p-8 shadow-sm">
        <h2 className="text-2xl font-bold mb-6 text-gray-primary">Order Summary</h2>
        <div className="space-y-4 mb-8">
          <div className="flex justify-between items-center">
            <span className="text-gray-tertiary font-medium">Subtotal</span>
            <span className="font-bold text-gray-secondary">${subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-tertiary font-medium">Shipping</span>
            <span className="font-bold text-green-500">Free</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-tertiary font-medium">Estimated Tax</span>
            <span className="font-bold text-gray-secondary">${tax.toFixed(2)}</span>
          </div>
          <hr className="border-white/20" />
          <div className="flex justify-between items-center text-xl">
            <span className="font-bold text-gray-primary">Total</span>
            <span className="font-bold text-gray-primary">${total.toLocaleString()}</span>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="relative">
            <Input 
              className="bg-white/40 border-none py-6 px-6 rounded-full focus:ring-2 focus:ring-accent-500/50 text-sm placeholder:text-gray-quaternary" 
              placeholder="Promo Code" 
            />
            <Button className="absolute right-2 top-2 bottom-2 bg-gray-primary text-white px-4 rounded-full text-xs font-bold transition-transform hover:scale-105 cursor-pointer">
              Apply
            </Button>
          </div>
          <Link href="/checkout" className="block w-full">
            <Button className="w-full bg-accent-500 text-gray-primary font-bold py-6 rounded-full flex items-center justify-center gap-2 group transition-all hover:opacity-90 active:scale-[0.98] border-none shadow-lg shadow-accent-500/20 cursor-pointer">
              Proceed to Checkout
              <ArrowRight className="group-hover:translate-x-1 transition-transform h-5 w-5" />
            </Button>
          </Link>
        </div>
        
        <div className="mt-8 pt-8 border-t border-white/20">
          <p className="text-sm font-semibold text-gray-quaternary mb-4 uppercase tracking-wider">Accepted Payments</p>
          <div className="flex gap-3">
            <div className="w-12 h-8 bg-white/40 rounded-md flex items-center justify-center border border-white/20">
              <CreditCard className="h-5 w-5 text-gray-tertiary" />
            </div>
            <div className="w-12 h-8 bg-white/40 rounded-md flex items-center justify-center border border-white/20">
              <Wallet className="h-5 w-5 text-gray-tertiary" />
            </div>
            <div className="w-12 h-8 bg-white/40 rounded-md flex items-center justify-center border border-white/20">
              <Landmark className="h-5 w-5 text-gray-tertiary" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Prime Promo Card */}
      <div className="bg-accent-500 p-8 rounded-[32px] relative overflow-hidden group shadow-lg shadow-accent-500/20">
        <div className="relative z-10">
          <h3 className="text-gray-primary text-2xl font-bold mb-2">Save with venn. Prime</h3>
          <p className="text-gray-secondary text-sm mb-6 max-w-[200px] font-medium leading-relaxed">Get free shipping and exclusive early access to new drops.</p>
          <Button className="bg-gray-primary text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-gray-secondary transition-colors border-none cursor-pointer">
            Join Now
          </Button>
        </div>
        <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-gray-primary/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
        <div className="absolute right-6 top-6 text-gray-primary/10 transform -rotate-12 group-hover:rotate-0 transition-transform duration-500">
           <Landmark className="h-16 w-16" />
        </div>
      </div>
    </div>
  );
}
