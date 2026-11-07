"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
    if (!activeLinkRef.current || !scrollContainerRef.current) return;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    activeLinkRef.current.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "nearest",
    });
  }, [currentCategory]);

  const itemClass = (isActive: boolean) =>
    cn(
      "flex w-full items-center justify-between rounded-full px-4 py-2.5 text-sm font-medium transition-colors duration-200",
      isActive
        ? "bg-accent-500 font-semibold text-gray-primary shadow-soft"
        : "text-gray-secondary hover:bg-white/60 hover:text-gray-primary"
    );

  return (
    <aside className="glass-component h-min w-full rounded-[1.75rem] p-5 lg:w-1/4 lg:p-6">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-tertiary">
        Categories
      </h2>

      <div
        ref={scrollContainerRef}
        className="custom-scrollbar flex max-h-[60vh] w-full flex-col gap-1 overflow-y-auto pr-1"
      >
        <Link
          href="/products?skip=0"
          aria-current={!currentCategory ? "page" : undefined}
          className={itemClass(!currentCategory)}
        >
          <span className="capitalize">All products</span>
        </Link>

        {categories.map((category) => {
          const isActive = currentCategory === category.slug;
          return (
            <Link
              key={category.slug}
              ref={isActive ? activeLinkRef : null}
              href={`/products?category=${category.slug}&skip=0`}
              aria-current={isActive ? "page" : undefined}
              className={itemClass(isActive)}
            >
              <span className="capitalize">{category.name}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
