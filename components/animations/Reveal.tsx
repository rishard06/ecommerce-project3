"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { spring } from "@/lib/motion";

/** Gap between consecutive items in a reveal sequence. */
export const REVEAL_STAGGER_MS = 60;

/** Small travel distance: the block settles into place instead of flying in. */
export const REVEAL_DISTANCE_PX = 16;

/** Milliseconds before item `index` of a sequence starts moving. */
export function revealDelay(index: number): number {
  return index * REVEAL_STAGGER_MS;
}

const hidden = { opacity: 0, y: REVEAL_DISTANCE_PX };
const shown = { opacity: 1, y: 0 };

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Position in the sequence; the delay is `index × REVEAL_STAGGER_MS`. */
  index?: number;
  /**
   * `load` plays as soon as the block mounts (hero choreography).
   * `view` waits until the block scrolls into view (sections below the fold).
   */
  trigger?: "load" | "view";
};

/**
 * One settling reveal, transform + opacity only, driven by `spring.smooth`.
 * Honours `prefers-reduced-motion` the same way `Stack` and
 * `MeshGradientBackground` do: the hook disables motion entirely and the
 * content renders in its final position.
 */
export default function Reveal({
  children,
  className,
  index = 0,
  trigger = "view",
}: RevealProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const transition = { ...spring.smooth, delay: revealDelay(index) / 1000 };

  if (trigger === "load") {
    return (
      <motion.div
        className={className}
        data-reveal={index}
        initial={hidden}
        animate={shown}
        transition={transition}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      data-reveal={index}
      initial={hidden}
      whileInView={shown}
      viewport={{ once: true, amount: 0.2 }}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}
