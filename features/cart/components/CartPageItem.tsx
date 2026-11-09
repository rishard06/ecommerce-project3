"use client";

import Image from "next/image";
import { Trash2, Minus, Plus } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { CartItem as CartItemType, useCartStore } from "@/lib/store/cart-store";
import { Button } from "@/components/ui/button";
import { spring } from "@/lib/motion";
import { formatCents } from "@/lib/money";

interface CartPageItemProps {
  item: CartItemType;
}

export function CartPageItem({ item }: CartPageItemProps) {
  const { updateQuantity, removeItem } = useCartStore();
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.article
      layout={!prefersReducedMotion}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -12 }}
      transition={spring.smooth}
      className="glass-component flex flex-col items-center gap-5 p-4 sm:flex-row sm:p-5"
    >
      <div className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/50 bg-white/60">
        <Image
          src={item.image}
          alt={item.title}
          width={112}
          height={112}
          sizes="112px"
          className="size-full object-contain p-2"
        />
      </div>

      <div className="flex w-full flex-1 flex-col gap-4">
        <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-start">
          <h2 className="text-lg font-semibold tracking-tight text-gray-primary">
            {item.title}
          </h2>
          <p className="text-lg font-semibold tabular-nums text-gray-secondary">
            {formatCents(item.priceCents * item.quantity)}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center rounded-full border border-gray-primary/10 bg-white/50 p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-full text-gray-secondary hover:bg-white/80"
              onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
              aria-label={`Decrease quantity of ${item.title}`}
            >
              <Minus className="size-4" aria-hidden="true" />
            </Button>
            <span
              className="min-w-10 text-center text-sm font-semibold tabular-nums text-gray-primary"
              aria-live="polite"
            >
              {item.quantity}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-full text-gray-secondary hover:bg-white/80"
              onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
              aria-label={`Increase quantity of ${item.title}`}
            >
              <Plus className="size-4" aria-hidden="true" />
            </Button>
          </div>

          <Button
            variant="ghost"
            onClick={() => removeItem(item.variantId)}
            className="h-9 gap-1.5 rounded-full px-3 text-sm font-medium text-gray-tertiary hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Remove ${item.title} from cart`}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Remove</span>
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
