"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface CheckboxProps {
  checked: boolean;
  /** Tri-state dash for "some selected" (e.g. select-all bars). */
  indeterminate?: boolean;
  onCheckedChange: (checked: boolean) => void;
  "aria-label": string;
  className?: string;
}

/**
 * Glassmorphic spring checkbox.
 *
 * A native input carries keyboard, focus, and screen-reader semantics; the
 * visible box is a motion layer: the fill cross-fades in ~150ms while the
 * glyph draws itself with a snappy, interruptible spring (tapping mid-draw
 * reverses it instead of snapping). The hit area is a full 44px even though
 * the visual box is 26px. Honors prefers-reduced-motion with a static glyph.
 */
export function Checkbox({
  checked,
  indeterminate = false,
  onCheckedChange,
  "aria-label": ariaLabel,
  className,
}: CheckboxProps) {
  const prefersReducedMotion = useReducedMotion();
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Screen readers announce "partially checked" only via the indeterminate
  // property — React has no prop for it, so it is set imperatively.
  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const filled = checked || indeterminate;

  return (
    <span
      className={cn(
        "flex size-11 shrink-0 items-center justify-center",
        className,
      )}
    >
      <motion.span
        whileTap={prefersReducedMotion ? undefined : { scale: 0.86 }}
        transition={spring.snappy}
        className="relative flex size-[26px] cursor-pointer items-center justify-center"
      >
        <input
          ref={inputRef}
          type="checkbox"
          checked={checked}
          onChange={(event) => onCheckedChange(event.target.checked)}
          aria-label={ariaLabel}
          className="peer absolute inset-0 size-full cursor-pointer opacity-0"
        />
        {/* Box: glass when empty, accent fill when checked. */}
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 rounded-[9px] border transition-colors duration-150",
            filled
              ? "border-transparent bg-accent-500 shadow-soft"
              : "border-gray-primary/25 bg-white/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] backdrop-blur-sm",
          )}
        />
        {/* Glyph: drawn by a spring so rapid toggles reverse mid-stroke. */}
        {!prefersReducedMotion ? (
          <motion.svg
            aria-hidden="true"
            viewBox="0 0 12 10"
            className="pointer-events-none absolute size-3.5 text-gray-primary"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ opacity: filled ? 1 : 0, scale: filled ? 1 : 0.6 }}
            transition={spring.snappy}
          >
            {indeterminate ? (
              <motion.line
                x1="2.5"
                y1="5"
                x2="9.5"
                y2="5"
                initial={false}
                animate={{ pathLength: 1 }}
                transition={spring.snappy}
              />
            ) : (
              <motion.path
                d="M2 5.5 4.8 8 10 2"
                initial={false}
                animate={{ pathLength: checked ? 1 : 0 }}
                transition={spring.snappy}
              />
            )}
          </motion.svg>
        ) : (
          <svg
            aria-hidden="true"
            viewBox="0 0 12 10"
            className={cn(
              "pointer-events-none absolute size-3.5 text-gray-primary",
              !filled && "hidden",
            )}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {indeterminate ? (
              <line x1="2.5" y1="5" x2="9.5" y2="5" />
            ) : (
              <path d="M2 5.5 4.8 8 10 2" />
            )}
          </svg>
        )}
        {/* Keyboard focus ring lives on the visual box via the peer input. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1 rounded-[13px] opacity-0 ring-2 ring-accent-700 ring-offset-2 ring-offset-transparent transition-opacity duration-150 peer-focus-visible:opacity-100"
        />
      </motion.span>
    </span>
  );
}
