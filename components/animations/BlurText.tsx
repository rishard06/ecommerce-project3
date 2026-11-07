"use client";

import { motion, useReducedMotion, type Transition, type Easing } from "motion/react";
import { useEffect, useRef, useState, useMemo } from "react";

type BlurTextProps = {
  text?: string;
  delay?: number;
  className?: string;
  /** Element used for the wrapper so the animation can carry a real heading. */
  as?: "p" | "h1" | "h2" | "span";
  animateBy?: "words" | "letters";
  direction?: "top" | "bottom";
  threshold?: number;
  rootMargin?: string;
  animationFrom?: Record<string, string | number>;
  animationTo?: Array<Record<string, string | number>>;
  easing?: Easing | Easing[];
  onAnimationComplete?: () => void;
  stepDuration?: number;
};

const buildKeyframes = (
  from: Record<string, string | number>,
  steps: Array<Record<string, string | number>>
): Record<string, Array<string | number>> => {
  const keys = new Set<string>([...Object.keys(from), ...steps.flatMap((s) => Object.keys(s))]);

  const keyframes: Record<string, Array<string | number>> = {};
  keys.forEach((k) => {
    keyframes[k] = [from[k], ...steps.map((s) => s[k])];
  });
  return keyframes;
};

/**
 * Word-by-word reveal. Movement is intentionally small (16px, 6px of blur)
 * because the eye reads large travel as a "loading" effect rather than a
 * material settling into place. Honours `prefers-reduced-motion` by rendering
 * the text immediately.
 */
const BlurText: React.FC<BlurTextProps> = ({
  text = "",
  delay = 60,
  className = "",
  as = "p",
  animateBy = "words",
  direction = "top",
  threshold = 0.1,
  rootMargin = "0px",
  animationFrom,
  animationTo,
  easing = [0.22, 1, 0.36, 1],
  onAnimationComplete,
  stepDuration = 0.45,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const elements = (animateBy === "words" ? text.split(/\s+/) : text.split("")).filter(
    (segment) => segment.length > 0
  );
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const Tag = as as React.ElementType;

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(ref.current as Element);
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const defaultFrom = useMemo(
    () =>
      direction === "top"
        ? { filter: "blur(6px)", opacity: 0, y: -16 }
        : { filter: "blur(6px)", opacity: 0, y: 16 },
    [direction]
  );

  const defaultTo = useMemo(
    () => [{ filter: "blur(0px)", opacity: 1, y: 0 }],
    []
  );

  const fromSnapshot = animationFrom ?? defaultFrom;
  const toSnapshots = animationTo ?? defaultTo;

  const stepCount = toSnapshots.length + 1;
  const totalDuration = stepDuration * (stepCount - 1);
  const times = Array.from({ length: stepCount }, (_, i) =>
    stepCount === 1 ? 0 : i / (stepCount - 1)
  );

  if (prefersReducedMotion) {
    return <Tag className={className}>{text}</Tag>;
  }

  return (
    <Tag ref={ref} className={`blur-text ${className} flex flex-wrap`}>
      {elements.map((segment, index) => {
        const animateKeyframes = buildKeyframes(fromSnapshot, toSnapshots);

        const spanTransition: Transition = {
          duration: totalDuration,
          times,
          delay: (index * delay) / 1000,
          ease: easing,
        };

        return (
          <motion.span
            key={`${segment}-${index}`}
            initial={fromSnapshot}
            animate={inView ? animateKeyframes : fromSnapshot}
            transition={spanTransition}
            onAnimationComplete={
              index === elements.length - 1 ? onAnimationComplete : undefined
            }
            style={{ display: "inline-block" }}
          >
            {segment === " " ? "\u00A0" : segment}
            {animateBy === "words" && index < elements.length - 1 && "\u00A0"}
          </motion.span>
        );
      })}
    </Tag>
  );
};

export default BlurText;
