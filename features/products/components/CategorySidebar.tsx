'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Category {
  slug: string;
  name: string;
}

interface CategorySidebarProps {
  categories: Category[];
  currentCategory?: string;
}

export function CategorySidebar({ categories, currentCategory }: CategorySidebarProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const activeLinkRef = React.useRef<HTMLAnchorElement>(null);

  React.useEffect(() => {
    if (activeLinkRef.current && scrollContainerRef.current) {
      activeLinkRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentCategory]);

  return (
    <div className="h-min w-full lg:w-1/4 bg-white/60 backdrop-blur-md rounded-3xl shadow-lg p-6 border border-white/20">
      <h3 className="text-xl font-bold mb-6 text-gray-800 tracking-tight">
        CATEGORIES
      </h3>

      <div 
        ref={scrollContainerRef}
        className="flex flex-col gap-2 w-full overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar scroll-smooth"
      >
        <Link
          href="/products?skip=0"
          className={cn(
            "w-[calc(100%-1rem)] px-6 py-3 ml-1 rounded-full flex justify-between items-center transition-all duration-300",
            !currentCategory 
              ? "bg-accent-500 shadow-md scale-[1.02]" 
              : "hover:bg-white/40 text-gray-600 hover:text-gray-900"
          )}
        >
          <p className="font-semibold text-sm capitalize">All products</p>
        </Link>

        {categories.map((category) => (
          <Link
            key={category.slug}
            ref={currentCategory === category.slug ? activeLinkRef : null}
            href={`/products?category=${category.slug}&skip=0`}
            className={cn(
              "w-[calc(100%-1rem)] ml-1 px-6 py-3 rounded-full flex justify-between items-center transition-all duration-300",
              currentCategory === category.slug
                ? "bg-accent-500 shadow-md scale-[1.02]"
                : "hover:bg-white/40 text-gray-600 hover:text-gray-900"
            )}
          >
            <p className="font-semibold text-sm capitalize">{category.name}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
