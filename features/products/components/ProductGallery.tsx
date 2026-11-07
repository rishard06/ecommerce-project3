"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ProductGalleryProps {
  images: string[];
}

export function ProductGallery({ images }: ProductGalleryProps) {
  const [selectedImage, setSelectedImage] = React.useState(0);
  const gallery = images.filter(Boolean);

  if (gallery.length === 0) {
    return (
      <div className="glass-component flex aspect-[4/3] w-full items-center justify-center rounded-[1.75rem] text-sm text-gray-tertiary">
        No image available
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="glass-component group relative aspect-[4/3] w-full overflow-hidden rounded-[1.75rem]">
        <Image
          src={gallery[selectedImage] ?? gallery[0]}
          alt="Product photo"
          fill
          sizes="(min-width: 1024px) 58vw, 100vw"
          className="object-contain p-8 transition-transform duration-500 ease-out-quart group-hover:scale-[1.02]"
          priority
        />
      </div>

      {gallery.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {gallery.slice(0, 4).map((image, index) => {
            const isSelected = selectedImage === index;
            return (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setSelectedImage(index)}
                aria-label={`Show image ${index + 1} of ${Math.min(gallery.length, 4)}`}
                aria-current={isSelected ? "true" : undefined}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-2xl border transition-[border-color,box-shadow,transform] duration-200 ease-out-quart",
                  isSelected
                    ? "border-accent-600 shadow-soft ring-2 ring-accent-500/20"
                    : "border-white/50 hover:border-accent-500/60 hover:shadow-soft"
                )}
              >
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="120px"
                  className={cn(
                    "object-cover p-1.5 transition-opacity duration-200",
                    isSelected ? "opacity-100" : "opacity-70 group-hover:opacity-100"
                  )}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
