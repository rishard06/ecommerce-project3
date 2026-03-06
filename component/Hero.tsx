import React from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Stack from "@/components/Stack";
import BlurText from "@/components/BlurText";

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
            <BlurText
              text="Building digital products & brands."
              delay={200}
              animateBy="words"
              direction="top"
              className="max-w-2xl mb-8 text-4xl font-extrabold tracking-tight leading-none md:text-5xl xl:text-6xl text-gray-primary"
            />
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
          <div className="w-full h-full mx-auto xl:w-1/2 py-4 flex items-center justify-center">
            <div style={{ width: 400, height: 400 }}>
              <Stack
                randomRotation={false}
                sensitivity={100}
                sendToBackOnClick={true}
                cards={images.map((src, i) => (
                  <Image
                    key={i}
                    src={src}
                    alt={`card-${i + 1}`}
                    width={400}
                    height={400}
                    draggable={false}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ))}
                autoplay={false}
                autoplayDelay={3000}
                pauseOnHover={false}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
