"use client";
import { motion } from "framer-motion";

export function CartBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="absolute -top-1 -right-1 bg-accent-500 text-gray-primary text-[10px] font-black size-5 rounded-full flex items-center justify-center shadow-lg border-2 border-white/50 pointer-events-none"
    >
      {count}
    </motion.span>
  );
}
