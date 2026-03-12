'use client';

import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ProductGalleryProps {
  images: string[];
}

export function ProductGallery({ images }: ProductGalleryProps) {
  const [selectedImage, setSelectedImage] = React.useState(0);

  return (
    <div className="flex flex-col gap-6">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl glass-component border border-white/40 shadow-2xl shadow-black/5 group">
        <Image
          src={images[selectedImage]}
          alt="Product image"
          fill
          className="object-contain p-8 group-hover:scale-110 transition-transform duration-700"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {images.slice(0, 4).map((image, index) => (
          <button
            key={index}
            onClick={() => setSelectedImage(index)}
            className={cn(
              "relative aspect-square overflow-hidden rounded-2xl border-2 transition-all cursor-pointer glass-component shadow-lg",
              selectedImage === index
                ? "border-accent-500 ring-4 ring-accent-500/10 scale-95"
                : "border-white/40 hover:border-accent-500 hover:scale-105"
            )}
          >
            <Image
              src={image}
              alt={`Thumbnail ${index + 1}`}
              fill
              className="object-cover p-2"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
