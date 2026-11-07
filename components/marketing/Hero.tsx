import React from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Stack from "@/components/animations/Stack";
import BlurText from "@/components/animations/BlurText";

export default function Hero() {
  const images = [
    "https://flowbite.s3.amazonaws.com/docs/gallery/square/image-10.jpg",
    "https://flowbite.s3.amazonaws.com/docs/gallery/featured/image.jpg",
    "https://flowbite.s3.amazonaws.com/docs/gallery/square/image-1.jpg",
    "https://flowbite.s3.amazonaws.com/docs/gallery/square/image-2.jpg",
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
        </div>

        <div className="flex w-full items-center justify-center lg:w-1/2">
          <div className="aspect-square w-full max-w-[420px]">
            <Stack
              randomRotation={false}
              sensitivity={90}
              sendToBackOnClick
              cards={images.map((src, index) => (
                <Image
                  key={src}
                  src={src}
                  alt=""
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
