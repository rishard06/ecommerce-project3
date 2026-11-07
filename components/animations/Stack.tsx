"use client";

import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  useReducedMotion,
  type PanInfo,
} from "motion/react";
import { useState, useEffect, useMemo } from "react";
import { spring } from "@/lib/motion";

interface CardRotateProps {
  children: React.ReactNode;
  onSendToBack: () => void;
  sensitivity: number;
  disableDrag?: boolean;
  reduceMotion?: boolean;
  isTop?: boolean;
  enableClick?: boolean;
}

function CardRotate({
  children,
  onSendToBack,
  sensitivity,
  disableDrag = false,
  reduceMotion = false,
  isTop = false,
  enableClick = false,
}: CardRotateProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], reduceMotion ? [0, 0] : [60, -60]);
  const rotateY = useTransform(x, [-100, 100], reduceMotion ? [0, 0] : [-60, 60]);
  // A touch of rubber-banding past the edges, then a spring back — never a jump.
  const dragTransition = { bounceStiffness: 280, bounceDamping: 26 };

  function handleDragEnd(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const passed =
      Math.abs(info.offset.x) > sensitivity || Math.abs(info.offset.y) > sensitivity;

    if (passed) {
      onSendToBack();
    }

    // Velocity handoff: the card leaves the finger at the speed the finger was
    // moving, so the return reads as one continuous physical event.
    animate(x, 0, { ...spring.smooth, velocity: info.velocity.x });
    animate(y, 0, { ...spring.smooth, velocity: info.velocity.y });
  }

  if (disableDrag) {
    return (
      <div className="absolute inset-0 pointer-events-none" aria-hidden={!isTop}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className="absolute inset-0 cursor-grab"
      style={{ x, y, rotateX, rotateY }}
      drag
      dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
      dragElastic={0.45}
      dragTransition={dragTransition}
      whileTap={{ cursor: "grabbing" }}
      onDragEnd={handleDragEnd}
      role={enableClick && isTop ? "button" : undefined}
      tabIndex={enableClick && isTop ? 0 : -1}
      aria-label={enableClick && isTop ? "Bring this card to the front" : undefined}
      onKeyDown={(event) => {
        if (!enableClick || !isTop) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSendToBack();
        }
      }}
    >
      {children}
    </motion.div>
  );
}

interface StackProps {
  randomRotation?: boolean;
  sensitivity?: number;
  sendToBackOnClick?: boolean;
  cards?: React.ReactNode[];
  animationConfig?: { stiffness: number; damping: number };
  autoplay?: boolean;
  autoplayDelay?: number;
  pauseOnHover?: boolean;
  mobileClickOnly?: boolean;
  mobileBreakpoint?: number;
}

export default function Stack({
  randomRotation = false,
  sensitivity = 200,
  cards = [],
  animationConfig = { stiffness: 260, damping: 30 },
  sendToBackOnClick = false,
  autoplay = false,
  autoplayDelay = 3000,
  pauseOnHover = false,
  mobileClickOnly = false,
  mobileBreakpoint = 768,
}: StackProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < mobileBreakpoint);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [mobileBreakpoint]);

  const shouldDisableDrag = mobileClickOnly && isMobile;
  const shouldEnableClick = sendToBackOnClick || shouldDisableDrag;

  // A stable pseudo-random tilt per card. Using Math.random() during render
  // would produce a different value on the server and the client, which React
  // reports as a hydration mismatch.
  const tilt = (index: number) =>
    (((index * 9301 + 49297) % 233280) / 233280) * 10 - 5;

  const rotations = useMemo(
    () => cards.map((_, index) => tilt(index)),
    [cards]
  );

  const [stack, setStack] = useState<{ id: number; content: React.ReactNode; initialRotation: number }[]>(() => {
    const initialCards = cards.length
      ? cards
      : [
          <img
            key="1"
            src="https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?q=80&w=500&auto=format"
            alt="card-1"
            className="w-full h-full object-cover pointer-events-none"
          />,
          <img
            key="2"
            src="https://images.unsplash.com/photo-1449844908441-8829872d2607?q=80&w=500&auto=format"
            alt="card-2"
            className="w-full h-full object-cover pointer-events-none"
          />,
          <img
            key="3"
            src="https://images.unsplash.com/photo-1452626212852-811d58933cae?q=80&w=500&auto=format"
            alt="card-3"
            className="w-full h-full object-cover pointer-events-none"
          />,
          <img
            key="4"
            src="https://images.unsplash.com/photo-1572120360610-d971b9d7767c?q=80&w=500&auto=format"
            alt="card-4"
            className="w-full h-full object-cover pointer-events-none"
          />,
        ];

    return initialCards.map((content, index) => ({
      id: index + 1,
      content,
      initialRotation: tilt(index),
    }));
  });

  useEffect(() => {
    if (cards.length) {
      setStack(
        cards.map((content, index) => ({
          id: index + 1,
          content,
          initialRotation: rotations[index] || 0,
        }))
      );
    }
  }, [cards, rotations]);

  const sendToBack = (id: number) => {
    setStack((prev) => {
      const newStack = [...prev];
      const index = newStack.findIndex((card) => card.id === id);
      if (index === -1) return prev;
      const [card] = newStack.splice(index, 1);
      newStack.unshift(card);
      return newStack;
    });
  };

  useEffect(() => {
    if (autoplay && stack.length > 1 && !isPaused) {
      const interval = setInterval(() => {
        const topCardId = stack[stack.length - 1].id;
        sendToBack(topCardId);
      }, autoplayDelay);

      return () => clearInterval(interval);
    }
  }, [autoplay, autoplayDelay, stack, isPaused]);

  return (
    <div
      className="relative w-full h-full"
      style={{ perspective: prefersReducedMotion ? undefined : 600 }}
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
    >
      {stack.map((card, index) => {
        const isTop = index === stack.length - 1;
        const randomRotate = randomRotation ? card.initialRotation : 0;
        const depth = stack.length - index - 1;

        return (
          <CardRotate
            key={card.id}
            onSendToBack={() => sendToBack(card.id)}
            sensitivity={sensitivity}
            disableDrag={shouldDisableDrag || !isTop}
            reduceMotion={!!prefersReducedMotion}
            isTop={isTop}
            enableClick={shouldEnableClick}
          >
            <motion.div
              className="rounded-[1.75rem] overflow-hidden w-full h-full shadow-lift"
              onClick={() => shouldEnableClick && isTop && sendToBack(card.id)}
              style={{ transformOrigin: "90% 90%" }}
              animate={{
                rotateZ: prefersReducedMotion ? 0 : depth * 4 + randomRotate,
                scale: prefersReducedMotion ? 1 : 1 - depth * 0.06,
                zIndex: index,
              }}
              initial={false}
              transition={{
                type: "spring",
                stiffness: animationConfig.stiffness,
                damping: animationConfig.damping,
              }}
            >
              {card.content}
            </motion.div>
          </CardRotate>
        );
      })}
    </div>
  );
}
