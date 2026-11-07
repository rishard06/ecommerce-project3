"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ShoppingBagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatePresence } from "motion/react";
import { useCartStore } from "@/lib/store/cart-store";
import { CartBadge } from "@/features/cart/components/CartBadge";
import { CartHoverCard } from "@/features/cart/components/CartHoverCard";
import CartPreview from "@/features/cart/components/CartPreview";

export default function CartAction() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const items = useCartStore((state) => state.items);

  const cartCount = mounted
    ? items.reduce((total, item) => total + item.quantity, 0)
    : 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isCartOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsCartOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isCartOpen]);

  return (
    <div
      className="relative"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setIsCartOpen(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setIsCartOpen(false);
      }}
    >
      <Button
        asChild
        variant="ghost"
        size="icon"
        className="rounded-full text-gray-secondary hover:bg-gray-primary/5"
      >
        <Link
          href="/cart"
          aria-label={`Cart, ${cartCount} items`}
          aria-haspopup="dialog"
          aria-expanded={isCartOpen}
          onClick={() => setIsCartOpen(false)}
        >
          <ShoppingBagIcon className="size-5" aria-hidden="true" />
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
