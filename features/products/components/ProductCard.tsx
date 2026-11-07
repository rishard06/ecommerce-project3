"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Plus, Heart } from "lucide-react";
import { useCartStore } from "@/lib/store/cart-store";
import { useFavoritesStore } from "@/lib/store/favorites-store";
import { motion, useReducedMotion } from "motion/react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/money";

export default function ProductCard({
  slug,
  variantId,
  title,
  priceCents,
  image,
  description,
  isPopular,
}: {
  slug: string;
  variantId: string;
  title: string;
  priceCents: number;
  image: string;
  description: string;
  isPopular?: boolean;
}) {
  const addItem = useCartStore((state) => state.addItem);
  const { toggleFavorite, isFavorite } = useFavoritesStore();
  const { data: session } = useSession();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  const favorited = isFavorite(slug);
  const productHref = `/products/${slug}`;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session) {
      router.push("/login");
      return;
    }

    addItem({
      variantId,
      productSlug: slug,
      title,
      priceCents,
      image,
    });
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session) {
      router.push("/login");
      return;
    }

    toggleFavorite({
      productSlug: slug,
      variantId,
      title,
      priceCents,
      image,
      description,
    });
  };

  return (
    <article className="glass-component group relative flex h-full flex-col overflow-hidden transition-[transform,box-shadow] duration-300 ease-out-quart hover:-translate-y-0.5 hover:shadow-lift">
      {/* A single overlay link keeps the whole card clickable without nesting
          interactive elements inside an anchor. */}
      <Link
        href={productHref}
        className="absolute inset-0 z-0 rounded-[1.5rem]"
        aria-label={`View ${title}`}
      />

      <div className="relative">
        <button
          type="button"
          onClick={handleFavorite}
          aria-label={favorited ? `Remove ${title} from favorites` : `Save ${title} to favorites`}
          aria-pressed={favorited}
          className="absolute right-3 top-3 z-20 flex size-10 items-center justify-center rounded-full border border-white/60 bg-white/70 text-gray-secondary shadow-soft backdrop-blur-md transition-colors hover:bg-white/90"
        >
          <motion.span
            animate={prefersReducedMotion ? undefined : { scale: favorited ? 1.12 : 1 }}
            transition={spring.snappy}
            className="flex"
          >
            <Heart
              className={cn("size-5", favorited && "text-destructive")}
              fill={favorited ? "currentColor" : "none"}
              aria-hidden="true"
            />
          </motion.span>
        </button>

        {isPopular && (
          <span className="absolute left-3 top-3 z-20 rounded-full bg-accent-500/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-primary shadow-soft">
            Popular
          </span>
        )}

        <Link
          href={productHref}
          className="pointer-events-none block"
          aria-hidden="true"
          tabIndex={-1}
        >
          <div className="relative h-56 w-full overflow-hidden">
            <Image
              src={image}
              alt=""
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="object-contain p-6 transition-transform duration-500 ease-out-quart group-hover:scale-[1.03]"
            />
          </div>
        </Link>
      </div>

      <div className="pointer-events-none relative z-10 flex flex-1 flex-col p-5 pt-3">
        <h3 className="mb-1.5 line-clamp-1 text-lg font-semibold tracking-tight text-gray-primary">
          {title}
        </h3>
        <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-gray-tertiary">
          {description}
        </p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="text-xl font-semibold tabular-nums tracking-tight text-gray-secondary">
            {formatCents(priceCents)}
          </span>
          <Button
            size="icon"
            className="pointer-events-auto relative z-20 size-11 rounded-full bg-accent-500 text-gray-primary shadow-soft hover:bg-accent-600"
            onClick={handleAddToCart}
            aria-label={`Add ${title} to cart`}
          >
            <Plus className="size-5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </article>
  );
}
