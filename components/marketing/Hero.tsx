import React from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import Stack from "@/components/animations/Stack";
import BlurText from "@/components/animations/BlurText";

export default function Hero() {
  const images = [
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
      alt: "Gold Longines wristwatch on a brown leather strap against a warm cream backdrop",
    },
  ];

  return (
    <section className="flex items-center px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-12 lg:flex-row lg:gap-16">
        <div className="w-full text-left lg:w-1/2">
          <BlurText
            text="Things worth keeping."
            delay={45}
            animateBy="words"
            direction="top"
            as="h1"
            className="mb-5 max-w-xl text-4xl font-semibold leading-[1.05] tracking-tight text-gray-primary sm:text-5xl xl:text-6xl"
          />
          <p className="mb-8 max-w-lg text-base leading-relaxed text-gray-secondary md:text-lg">
            A small shop of well-made everyday objects. Clear prices, fast
            delivery, no noise between you and the thing you want.
          </p>
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
          {/* rating mirrors Testimonies 5-star cards */}
          <div
            data-testid="hero-proof"
            className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-tertiary"
          >
            <span className="inline-flex items-center gap-1.5 text-gray-secondary">
              <Star
                className="size-4 text-yellow-500"
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
        </div>

        <div className="flex w-full items-center justify-center lg:w-1/2">
          <div className="aspect-square w-full max-w-[420px]">
            <Stack
              randomRotation={false}
              sensitivity={90}
              sendToBackOnClick
              cards={images.map(({ src, alt }, index) => (
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
          </div>
        </div>
      </div>
    </section>
  );
}
