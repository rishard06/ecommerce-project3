"use client";

import { motion } from "motion/react";
import { spring } from "@/lib/motion";

export function CartBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <motion.span
      key={count}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={spring.snappy}
      aria-hidden="true"
      className="pointer-events-none absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white/70 bg-accent-500 px-1 text-[10px] font-bold tabular-nums text-gray-primary shadow-soft"
    >
      {count > 99 ? "99+" : count}
    </motion.span>
  );
}
