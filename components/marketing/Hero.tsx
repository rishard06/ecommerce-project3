"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, Hand, Star } from "lucide-react";
import Stack from "@/components/animations/Stack";
import BlurText from "@/components/animations/BlurText";
import Reveal from "@/components/animations/Reveal";
import { fade } from "@/lib/motion";

/** Deck order follows the asset filenames. Pure image browsing — no links. */
const deck = [
  {
    src: "/landing/chopping-board.webp",
    alt: "Rounded oak chopping board resting against a warm cream studio backdrop",
  },
  {
    src: "/landing/bedside-table.webp",
    alt: "Cherry wood bedside table with one drawer and an open shelf against a warm cream backdrop",
  },
  {
    src: "/landing/mug-tree.webp",
    alt: "Six-hook black iron mug tree standing against a warm cream studio backdrop",
  },
  {
    src: "/landing/leather-watch.webp",
    alt: "Brown leather-strap wristwatch against a warm cream studio backdrop",
  },
];

export default function Hero() {
  const prefersReducedMotion = useReducedMotion();
  const [hintVisible, setHintVisible] = useState(true);

  return (
    <div className="hero-grid grid w-full items-end gap-8 min-[981px]:grid-cols-[minmax(0,1.5fr)_minmax(0,0.5fr)] min-[981px]:gap-12">
      <div className="min-w-0 text-left">
        <Reveal trigger="load" index={0}>
          <BlurText
            text="Things worth keeping."
            delay={45}
            animateBy="words"
            direction="top"
            as="h1"
            className="display font-display mb-5 max-w-[13ch] font-semibold text-gray-primary [&>span:last-child]:text-accent-text [&>span:last-child]:italic"
          />
        </Reveal>
        <Reveal trigger="load" index={1}>
          <p className="mb-8 max-w-[46ch] text-base leading-[1.65] text-gray-secondary md:text-lg">
            A small shop of well-made everyday objects. Clear prices, fast
            delivery, no noise between you and the thing you want.
          </p>
        </Reveal>
        <Reveal trigger="load" index={2}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <Link href="/products" className="inline-block cursor-pointer">
              <Button
                size="lg"
                className="group h-12 rounded-full bg-action px-6 text-base font-semibold text-action-foreground shadow-soft hover:bg-action-hover"
              >
                Browse products
                <ArrowRight
                  data-icon="inline-end"
                  className="ml-1 size-4 transition-transform duration-200 ease-out-quart group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </Button>
            </Link>
            <Link
              href="#featured"
              className="group inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-line-strong px-5 text-sm font-medium text-gray-secondary transition-colors duration-200 ease-out-quart hover:border-accent-text/50 hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Bestsellers
              <ArrowDown
                className="size-4 transition-transform duration-200 ease-out-quart group-hover:translate-y-0.5 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </Link>
          </div>
          {/* rating mirrors Testimonies 5-star cards */}
          <div
            data-testid="hero-proof"
            className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-tertiary"
          >
            <span className="inline-flex items-center gap-1.5 text-gray-secondary">
              <Star
                className="size-4 text-accent-text"
                fill="currentColor"
                aria-hidden="true"
              />
              <span>5-star rated</span>
            </span>
            <span aria-hidden="true" className="text-gray-quaternary">
              ·
            </span>
            <span>30-day returns</span>
            <span aria-hidden="true" className="text-gray-quaternary">
              ·
            </span>
            <span>Ships same day</span>
          </div>
        </Reveal>
      </div>

      <Reveal
        trigger="load"
        index={3}
        className="flex w-full items-center justify-center border-t border-line pt-8 min-[981px]:border-t-0 min-[981px]:border-l min-[981px]:pt-0 min-[981px]:pl-6"
      >
        <div className="relative aspect-square w-full max-w-[360px]">
          <motion.div
            className="size-full"
            initial={false}
            animate={
              prefersReducedMotion
                ? { rotate: 0, y: 0 }
                : { rotate: [0, 0.8, 0, -0.8, 0], y: [0, -5, 0, -5, 0] }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                // Keyframe sequences cannot run on a spring (springs only
                // support two keyframes), so the ambient wobble loops as a
                // slow tween instead.
                : {
                    type: "tween",
                    duration: 6,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatDelay: 1,
                  }
            }
          >
            <Stack
              randomRotation={false}
              sensitivity={90}
              sendToBackOnClick
              onFirstInteract={() => setHintVisible(false)}
              cards={deck.map(({ src, alt }, index) => (
                <Image
                  key={src}
                  src={src}
                  alt={alt}
                  width={420}
                  height={420}
                  sizes="(min-width: 981px) 360px, 80vw"
                  draggable={false}
                  className="size-full object-cover"
                  priority={index === 0}
                />
              ))}
              autoplay={false}
              autoplayDelay={3000}
              pauseOnHover={false}
            />
          </motion.div>
          <motion.span
            data-testid="deck-hint"
            aria-hidden={!hintVisible}
            className="pointer-events-none absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-surface-dark px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur-sm"
            initial={false}
            animate={{ opacity: hintVisible ? 1 : 0 }}
            transition={fade}
          >
            <Hand className="size-3.5" aria-hidden="true" />
            Drag to explore
          </motion.span>
        </div>
      </Reveal>
    </div>
  );
}
