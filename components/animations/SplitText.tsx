"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

export interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  ease?: string | ((t: number) => number) | number[];
  splitType?: "chars" | "words" | "lines" | "words, chars";
  from?: Record<string, string | number>;
  to?: Record<string, string | number>;
  threshold?: number;
  rootMargin?: string;
  tag?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";
  textAlign?: React.CSSProperties["textAlign"];
  onLetterAnimationComplete?: () => void;
}

function splitUnits(text: string, splitType: string): { units: string[]; cls: string } {
  if (splitType.includes("chars") && !splitType.includes("words,")) {
    return { units: Array.from(text), cls: "split-char" };
  }
  if (splitType.includes("words")) {
    return { units: text.split(/(\s+)/).filter((s) => s.length > 0), cls: "split-word" };
  }
  return { units: Array.from(text), cls: "split-char" };
}

const SplitText: React.FC<SplitTextProps> = ({
  text,
  className = "",
  delay = 50,
  duration = 1.25,
  ease = "power3.out",
  splitType = "chars",
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  threshold = 0.1,
  rootMargin = "-100px",
  tag = "p",
  textAlign = "center",
  onLetterAnimationComplete,
}) => {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const doneRef = useRef(false);

  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const el = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  useEffect(() => {
    if (inView && !doneRef.current) {
      const t = setTimeout(() => {
        doneRef.current = true;
        onLetterAnimationComplete?.();
      }, Math.round(duration * 1000) + delay * text.length);
      return () => clearTimeout(t);
    }
  }, [inView, duration, delay, text.length, onLetterAnimationComplete]);

  if (prefersReducedMotion) {
    const Tag = tag as React.ElementType;
    return (
      <Tag ref={ref} style={{ textAlign }} className={className}>
        {text}
      </Tag>
    );
  }

  const { units, cls } = splitUnits(text, splitType);
  const Tag = motion[tag as "p"] as unknown as React.ElementType;

  return (
    <Tag
      ref={ref}
      style={{ textAlign, willChange: "transform, opacity" }}
      className={`split-parent overflow-hidden inline-block whitespace-normal ${className}`}
    >
      {units.map((unit, i) =>
        unit.trim() === "" ? (
          <span key={i}>&nbsp;</span>
        ) : (
          <motion.span
            key={i}
            className={cls}
            style={{ display: "inline-block", willChange: "transform, opacity" }}
            initial={from}
            animate={inView ? to : from}
            transition={{
              duration,
              delay: (i * delay) / 1000,
              ease: Array.isArray(ease) ? (ease as [number, number, number, number]) : "easeOut",
            }}
          >
            {unit}
          </motion.span>
        ),
      )}
    </Tag>
  );
};

export default SplitText;
