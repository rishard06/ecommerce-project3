"use client";
import Image from "next/image";
import { Trash2, Minus, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { CartItem as CartItemType, useCartStore } from "@/lib/store/cart-store";
import { Button } from "@/components/ui/button";

interface CartPageItemProps {
  item: CartItemType;
}

export function CartPageItem({ item }: CartPageItemProps) {
  const { updateQuantity, removeItem } = useCartStore();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="glass-component p-6 flex flex-col sm:flex-row gap-6 items-center transition-all hover:shadow-hover"
    >
      <div className="w-32 h-32 bg-white/40 dark:bg-black/20 backdrop-blur-md rounded-2xl flex items-center justify-center overflow-hidden border border-white/40">
        <Image
          src={item.image}
          alt={item.title}
          width={128}
          height={128}
          className="object-contain p-2 hover:scale-110 transition-transform duration-500"
        />
      </div>
      
      <div className="flex-grow text-center sm:text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-gray-primary">{item.title}</h3>
          <p className="text-xl font-bold text-gray-secondary">${item.price.toLocaleString()}</p>
        </div>
        <p className="text-gray-tertiary text-sm mb-4 font-medium">Model: 2024</p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/20 rounded-full px-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-white/20 cursor-pointer"
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="px-4 font-bold text-gray-primary">{item.quantity}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-white/20 cursor-pointer"
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          <Button
            variant="ghost"
            onClick={() => removeItem(item.id)}
            className="text-red-500 hover:text-red-600 hover:bg-red-500/10 flex items-center gap-1 font-medium transition-colors cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Remove</span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
