"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { spring } from "@/lib/motion";

export function CartHoverCard({ children }: { children: ReactNode }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      role="dialog"
      aria-label="Cart preview"
      initial={
        prefersReducedMotion
          ? { opacity: 0 }
          : { opacity: 0, y: -8, scale: 0.97 }
      }
      animate={
        prefersReducedMotion
          ? { opacity: 1 }
          : { opacity: 1, y: 0, scale: 1 }
      }
      exit={
        prefersReducedMotion
          ? { opacity: 0 }
          : { opacity: 0, y: -6, scale: 0.98 }
      }
      transition={spring.sheet}
      style={{ transformOrigin: "top right" }}
      className="absolute right-0 top-full z-50 mt-3 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-[1.75rem] border border-white/55 bg-white/75 p-2 shadow-panel backdrop-blur-2xl"
    >
      <div className="overflow-hidden rounded-[1.4rem] border border-white/40 bg-white/80">
        {children}
      </div>
    </motion.div>
  );
}
