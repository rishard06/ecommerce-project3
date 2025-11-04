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
import { ArrowRight } from "lucide-react";

const Hero = ({ session }) => {
  const images = [
    "https://flowbite.s3.amazonaws.com/blocks/marketing-ui/hero/phone-mockup.png",
    "https://flowbite.s3.amazonaws.com/docs/gallery/featured/image.jpg",
    "https://flowbite.s3.amazonaws.com/docs/gallery/square/image-1.jpg",
    "https://flowbite.s3.amazonaws.com/docs/gallery/square/image-2.jpg",
  ];

  return (
    <section className="h-[calc(100vh-8.5rem)] flex items-center justify-center">
      <div className="flex w-[80%] container mx-auto">
        <div className="flex flex-col justify-between w-full xl:flex-row items-center">
          <div className="w-full xl:w-1/2 text-left mx-auto xl:col-span-7  py-4">
            <h1 className="max-w-2xl mb-8 text-4xl font-extrabold tracking-tight leading-none md:text-5xl xl:text-6xl dark:text-gray-800">
              Building digital products & brands.
            </h1>
            <p className="max-w-2xl mb-10 font-light text-gray-400 lg:mb-12 md:text-lg lg:text-xl dark:text-gray-700">
              This free and open-source landing page template was built using
              the utility classes from Tailwind CSS and based on the components
              from the Flowbite Library and the Blocks System.
            </p>
            <Button className="bg-blue-500 hover:bg-blue-600 hover:cursor-pointer text-white font-bold py-2 px-4 rounded-full">
              Find Products
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <div className="w-full mx-auto xl:w-1/2 py-4 glass-component">
            <Carousel
              className="max-w-md mx-auto"
              opts={{ loop: true }}
            >
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
                variant="default"
                className="hover:cursor-pointer"
              />
              <CarouselNext
                variant="default"
                className="hover:cursor-pointer"
              />
            </Carousel>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
