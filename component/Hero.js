import React from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import Image from 'next/image';

const Hero = ({ session }) => {
  const images = [
    "https://flowbite.s3.amazonaws.com/blocks/marketing-ui/hero/phone-mockup.png",
    "https://flowbite.s3.amazonaws.com/docs/gallery/featured/image.jpg",
    "https://flowbite.s3.amazonaws.com/docs/gallery/square/image-1.jpg",
    "https://flowbite.s3.amazonaws.com/docs/gallery/square/image-2.jpg",
  ];

  return (
    <section className="relative h-screen flex items-center justify-center top-30 lg:top-0">
      <div className="flex w-[80%] container mx-auto">
        <div className="flex flex-col justify-between lg:flex-row items-center">
          <div className="w-full lg:w-1/2 text-left mx-auto lg:col-span-7 glass-component px-6 py-4">
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
            </Button>
          </div>
          <div className="w-full lg:w-1/2">
            <Carousel className="w-full max-w-md mx-auto" opts={{ loop: true }}>
              <CarouselContent>
                {images.map((src, index) => (
                  <CarouselItem key={index}>
                    <div className="p-1">
                      <div className="flex aspect-square items-center justify-center">
                        <Image src={src} alt={`Image ${index + 1}`} width={400} height={400} className='rounded-3xl hover:cursor-grab active:cursor-grabbing' />
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious  variant="default" className="hover:cursor-pointer" />
              <CarouselNext variant="default" className="hover:cursor-pointer" />
            </Carousel>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
