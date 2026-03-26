"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ShoppingBagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatePresence } from "framer-motion";
import { useCartStore } from "@/lib/store/cart-store";
import { CartBadge } from "../CartBadge";
import { CartHoverCard } from "../CartHoverCard";
import CartPreview from "../CartPreview";

export default function CartAction() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { getTotalItems } = useCartStore();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    setCartCount(getTotalItems());
  }, [getTotalItems()]);

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsCartOpen(true)}
      onMouseLeave={() => setIsCartOpen(false)}
    >
      <Button asChild variant="ghost" size="icon" className="relative hover:bg-white/20 transition-all rounded-full">
        <Link href="/cart">
          <ShoppingBagIcon className="h-6 w-6" />
          <CartBadge count={cartCount} />
        </Link>
      </Button>

      <AnimatePresence>
        {isCartOpen && (
          <CartHoverCard>
            <CartPreview />
          </CartHoverCard>
        )}
      </AnimatePresence>
    </div>
  );
}
