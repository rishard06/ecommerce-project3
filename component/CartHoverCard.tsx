"use client";
import { motion } from "framer-motion";
import { ReactNode } from "react";

export function CartHoverCard({ children }: { children: ReactNode }) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: 15, scale: 0.95, filter: "blur(10px)" }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
      className="absolute right-0 top-full mt-4 w-[380px] bg-white/70 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden z-50 origin-top-right border border-white/60 p-2"
    >
      <div className="bg-white rounded-4xl overflow-hidden border border-white/20">
      
        {children}
      </div>
    </motion.div>
  );
}
