"use client";

import Image from "next/image";
import { Trash2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { CartItem as CartItemType } from "@/lib/store/cart-store";
import { spring } from "@/lib/motion";

interface CartItemProps {
  item: CartItemType;
  onRemove: (id: number) => void;
}

export function CartItem({ item, onRemove }: CartItemProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      layout={!prefersReducedMotion}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -12 }}
      transition={spring.smooth}
      className="group mb-1 flex gap-3 rounded-2xl border border-transparent p-2.5 transition-colors hover:border-gray-primary/10 hover:bg-gray-primary/[0.04]"
    >
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-white/50 bg-white/60">
        <Image
          src={item.image}
          alt={item.title}
          fill
          sizes="64px"
          className="object-contain p-2"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <h4 className="truncate text-sm font-semibold leading-tight text-gray-primary">
            {item.title}
          </h4>
          <p className="mt-0.5 text-xs font-medium text-gray-tertiary">
            {item.quantity} ×{" "}
            <span className="text-gray-secondary">
              ${item.price.toLocaleString()}
            </span>
          </p>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-sm font-semibold tracking-tight text-gray-secondary">
            ${(item.price * item.quantity).toLocaleString()}
          </span>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="rounded-lg p-1.5 text-gray-quaternary opacity-100 transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            aria-label={`Remove ${item.title} from cart`}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
