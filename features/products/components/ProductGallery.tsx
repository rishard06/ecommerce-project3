'use client';

import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface ProductGalleryProps {
  images: string[];
}

export function ProductGallery({ images }: ProductGalleryProps) {
  const [selectedImage, setSelectedImage] = React.useState(0);

  return (
    <div className="flex flex-col gap-6">
      <Card className="relative aspect-video w-full overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-sm">
        <Image
          src={images[selectedImage]}
          alt="Product image"
          fill
          className="object-cover"
          priority
        />
      </Card>
      <div className="grid grid-cols-4 gap-4">
        {images.slice(0, 4).map((image, index) => (
          <button
            key={index}
            onClick={() => setSelectedImage(index)}
            className={cn(
              "relative aspect-square overflow-hidden rounded-lg border-2 transition-all cursor-pointer",
              selectedImage === index
                ? "border-accent-500 ring-2 ring-accent-500/20"
                : "border-slate-200 dark:border-slate-800 hover:border-accent-500"
            )}
          >
            <Image
              src={image}
              alt={`Thumbnail ${index + 1}`}
              fill
              className="object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
