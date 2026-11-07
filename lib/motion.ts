import type { Transition } from "motion/react";

/**
 * Motion presets distilled from Apple's *Designing Fluid Interfaces*.
 *
 * Springs are the default because they are velocity-aware and interruptible —
 * a dragging gesture can hand off to them at any instant without a seam.
 * Duration-based tweens are reserved for simple opacity fades where the eye
 * cannot perceive a start/stop.
 */
export const spring = {
  /** Immediate control feedback: press, toggle, badge. */
  snappy: {
    type: "spring",
    stiffness: 520,
    damping: 34,
    mass: 0.7,
  },
  /** Default for panels, cards, and layout changes. */
  smooth: {
    type: "spring",
    stiffness: 320,
    damping: 32,
    mass: 0.9,
  },
  /** Sheets and menus that travel further; slightly heavier to feel grounded. */
  sheet: {
    type: "spring",
    stiffness: 380,
    damping: 40,
    mass: 0.9,
  },
  /** Large surfaces that should settle without overshoot. */
  gentle: {
    type: "spring",
    stiffness: 220,
    damping: 30,
    mass: 1,
  },
} satisfies Record<string, Transition>;

/** A short, non-bouncy fade for content swaps. */
export const fade: Transition = {
  duration: 0.18,
  ease: [0.25, 1, 0.5, 1],
};
