"use client";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { CartItem as CartItemType } from "@/lib/store/cart-store";

interface CartItemProps {
  item: CartItemType;
  onRemove: (id: number) => void;
}

export function CartItem({ item, onRemove }: CartItemProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex gap-4 p-3 hover:bg-gray-tertiary/10 rounded-2xl transition-all duration-300 group mb-2 border border-transparent hover:border-white/20"
    >
      <div className="relative size-16 bg-white/40 backdrop-blur-md rounded-xl overflow-hidden flex-shrink-0 border border-white/20">
        <Image
          src={item.image}
          alt={item.title}
          fill
          className="object-contain p-2 group-hover:scale-110 transition-transform duration-500"
        />
      </div>
      <div className="flex flex-col justify-between flex-1 min-w-0">
        <div>
          <h4 className="text-sm font-bold text-gray-primary truncate leading-tight group-hover:text-accent-600 transition-colors">
            {item.title}
          </h4>
          <p className="text-xs text-gray-tertiary font-medium mt-0.5">
            {item.quantity} × <span className="text-gray-secondary">${item.price.toLocaleString()}</span>
          </p>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-sm font-black text-gray-secondary tracking-tight">
            ${(item.price * item.quantity).toLocaleString()}
          </span>
          <button
            onClick={() => onRemove(item.id)}
            className="p-1.5 text-gray-quaternary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
            aria-label="Remove item"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
