import React from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Hero() {
  const images = [
    "https://flowbite.s3.amazonaws.com/docs/gallery/square/image-10.jpg",
    "https://flowbite.s3.amazonaws.com/docs/gallery/featured/image.jpg",
    "https://flowbite.s3.amazonaws.com/docs/gallery/square/image-1.jpg",
    "https://flowbite.s3.amazonaws.com/docs/gallery/square/image-2.jpg",
  ];

  return (
    <section className="min-h-[calc(100vh+8rem)] xl:min-h-[calc(100vh-8.5rem)] flex items-start md:items-center justify-center">
      <div className="flex w-[80%] shrink-0 container mx-auto">
        <div className="flex flex-col justify-between w-full xl:flex-row gap-4 items-center">
          <div className="w-full xl:w-1/2 text-left mx-auto xl:col-span-7 py-4">
            <h1 className="max-w-2xl mb-8 text-4xl font-extrabold tracking-tight leading-none md:text-5xl xl:text-6xl text-gray-primary">
              Building digital products & brands.
            </h1>
            <p className="max-w-2xl mb-10 font-light lg:mb-12 md:text-lg lg:text-xl text-gray-secondary">
              Websites that are both affordable and effective, with a smart
              choice and a smart price.
            </p>
            <Link href="/products">
              <Button className="bg-accent-500 hover:bg-accent-600 hover:cursor-pointer text-gray-secondary font-bold py-6 px-6 rounded-full">
                Find Products
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="w-full mx-auto xl:w-1/2 py-4">
            <Carousel className="max-w-md mx-auto" opts={{ loop: true }}>
              <CarouselContent>
                {images.map((src, index) => (
                  <CarouselItem key={index}>
                    <div className="p-1">
                      <div className="flex aspect-square items-center justify-center relative">
                        <Image
                          src={src}
                          alt={`Image ${index + 1}`}
                          fill
                          priority={index === 0}
                          fetchPriority={index === 0 ? "high" : "auto"}
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="rounded-3xl hover:cursor-grab active:cursor-grabbing"
                          style={{ objectFit: "cover" }}
                        />
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious
                variant="outline"
                className="hover:cursor-pointer left-6 bg-transparent"
              />
              <CarouselNext
                variant="outline"
                className="hover:cursor-pointer right-6 bg-transparent shadow-primary-foreground"
              />
            </Carousel>
          </div>
        </div>
      </div>
    </section>
  );
};
