"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Hand } from "lucide-react";
import Stack from "@/components/animations/Stack";
import BlurText from "@/components/animations/BlurText";
import Reveal from "@/components/animations/Reveal";
import { fade, spring } from "@/lib/motion";

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
    <section className="flex items-center px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-12 lg:flex-row lg:gap-16">
        <div className="w-full text-left lg:w-1/2">
          <Reveal trigger="load" index={0}>
            <BlurText
              text="Things worth keeping."
              delay={45}
              animateBy="words"
              direction="top"
              as="h1"
              className="mb-5 max-w-xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-gray-primary sm:text-5xl xl:text-6xl"
            />
          </Reveal>
          <Reveal trigger="load" index={1}>
            <p className="mb-8 max-w-lg text-base leading-relaxed text-gray-secondary md:text-lg">
              A small shop of well-made everyday objects. Clear prices, fast
              delivery, no noise between you and the thing you want.
            </p>
          </Reveal>
          <Reveal trigger="load" index={2}>
            <Link href="/products" className="inline-block">
              <Button
                size="lg"
                className="group h-12 rounded-full bg-accent-500 px-6 text-base font-semibold text-gray-primary shadow-soft hover:bg-accent-600"
              >
                Browse products
                <ArrowRight
                  className="ml-1 size-4 transition-transform duration-200 ease-out-quart group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Button>
            </Link>
          </Reveal>
        </div>

        <Reveal
          trigger="load"
          index={3}
          className="flex w-full items-center justify-center lg:w-1/2"
        >
          <div className="relative aspect-square w-full max-w-[420px]">
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
                  : { ...spring.gentle, repeat: Infinity, repeatDelay: 1 }
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
                    sizes="(min-width: 1024px) 420px, 80vw"
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
              className="pointer-events-none absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm"
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
    </section>
  );
}
