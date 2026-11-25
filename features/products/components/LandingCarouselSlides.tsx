"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ImageOff } from "lucide-react";
import { useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import type { LandingCarouselSlide } from "./landing-carousel-data";

/** Time each slide stays on screen before autoplay advances. */
export const AUTOPLAY_INTERVAL_MS = 4000;

export default function LandingCarouselSlides({
  slides,
}: {
  slides: LandingCarouselSlide[];
}) {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const prefersReducedMotion = useReducedMotion();

  React.useEffect(() => {
    if (!api) return;

    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);

    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  React.useEffect(() => {
    if (!api || paused || prefersReducedMotion) return;

    // Re-armed whenever the active slide changes so a manual drag or dot click
    // gets a full interval before autoplay moves on again.
    const timer = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      api.scrollNext();
    }, AUTOPLAY_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [api, current, paused, prefersReducedMotion]);

  return (
    <Carousel
      aria-label="Product highlights"
      className="w-full"
      opts={{ loop: true, align: "start", duration: 28 }}
      setApi={setApi}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onPointerDown={() => setPaused(true)}
      onPointerUp={() => setPaused(false)}
      onPointerCancel={() => setPaused(false)}
    >
      <CarouselContent>
        {slides.map((slide, index) => (
          <CarouselItem
            key={slide.slug}
            aria-label={`${index + 1} of ${slides.length}`}
          >
            <Link
              href={`/products/${slide.slug}`}
              aria-label={`View ${slide.title}`}
              className="group glass-component flex h-full flex-col overflow-hidden rounded-[1.75rem] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 md:h-[360px] md:flex-row"
            >
              <div className="relative h-60 w-full shrink-0 overflow-hidden bg-surface-light md:h-full md:w-1/2">
                {slide.image ? (
                  <Image
                    src={slide.image}
                    alt={slide.alt}
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    priority={index === 0}
                    className={cn(
                      "object-contain p-8",
                      !prefersReducedMotion &&
                        "transition-transform duration-500 ease-out-quart group-hover:scale-[1.03]",
                    )}
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <ImageOff
                      className="size-10 text-gray-quaternary"
                      aria-hidden="true"
                    />
                    <span className="sr-only">No product image available</span>
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col justify-center gap-3 p-6 sm:p-8">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-text">
                  {slide.categoryName}
                </span>
                <h3 className="font-display text-2xl font-semibold tracking-tight text-gray-primary sm:text-3xl">
                  {slide.title}
                </h3>
                <p className="line-clamp-2 text-sm leading-relaxed text-gray-secondary">
                  {slide.description}
                </p>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-4">
                  <span className="text-lg font-semibold tabular-nums tracking-tight text-gray-secondary">
                    {slide.price}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-accent-text">
                    View product
                    <ArrowRight
                      className="size-4 transition-transform duration-200 ease-out-quart group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </div>
              </div>
            </Link>
          </CarouselItem>
        ))}
      </CarouselContent>

      <CarouselPrevious className="left-2 border-border bg-background/80 text-gray-secondary backdrop-blur-sm hover:bg-secondary sm:left-3" />
      <CarouselNext className="right-2 border-border bg-background/80 text-gray-secondary backdrop-blur-sm hover:bg-secondary sm:right-3" />

      <div
        role="group"
        aria-label="Carousel pagination"
        className="mt-6 flex items-center justify-center gap-2"
      >
        {slides.map((slide, index) => (
          <button
            key={slide.slug}
            type="button"
            aria-label={`Show slide ${index + 1}: ${slide.title}`}
            aria-current={index === current ? "true" : undefined}
            onClick={() => api?.scrollTo(index)}
            className={cn(
              "h-2.5 rounded-full transition-[width,background-color] duration-200 ease-out-quart focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              index === current
                ? "w-6 bg-action"
                : "w-2.5 bg-gray-quaternary/60 hover:bg-gray-tertiary",
            )}
          />
        ))}
      </div>
    </Carousel>
  );
}
