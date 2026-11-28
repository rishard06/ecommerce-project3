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
  featured = false,
}: {
  slug: string;
  variantId: string;
  title: string;
  priceCents: number;
  image: string;
  description: string;
  isPopular?: boolean;
  /** Renders the catalog bento's 2x2 bestseller tile (t1). */
  featured?: boolean;
}) {
  const addItem = useCartStore((state) => state.addItem);
  const { toggleFavorite, isFavorite } = useFavoritesStore();
  const { data: session } = useSession();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  // The favorites store is persisted to localStorage, which does not exist
  // during SSR — the server always renders "not favorited". Gate on mount so
  // the first client render matches the server HTML (NavBar, MobileMenu,
  // favorites page, and cart components all use this same pattern).
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const favorited = mounted && isFavorite(slug);
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
    <motion.article
      data-tile={featured ? "t1" : undefined}
      className={cn(
        featured
          ? "bento-card group relative flex h-full flex-col col-span-2 row-span-2 overflow-clip rounded-[1.25rem] border border-line bg-[linear-gradient(150deg,var(--panel-2),var(--panel))] p-5 max-[540px]:col-span-1 max-[540px]:row-span-1 max-[540px]:min-h-[420px]"
          : "glass-component group relative flex h-full flex-col overflow-clip hover:shadow-lift",
        !prefersReducedMotion &&
          "transition-shadow duration-[180ms] ease-out-quart",
      )}
      // Transform-only tactile feedback: the card lifts 2px on hover and
      // compresses 2% while pressed. The CSS hover lift is gone so motion owns
      // the transform outright; box-shadow stays a CSS transition.
      whileHover={prefersReducedMotion ? undefined : { y: -2 }}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
      transition={prefersReducedMotion ? undefined : spring.smooth}
    >
      {featured && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 -right-14 size-[340px] rounded-full bg-action/20 blur-2xl"
        />
      )}

      {/* A single overlay link keeps the whole card clickable without nesting
          interactive elements inside an anchor. */}
      <Link
        href={productHref}
        className={cn(
          "absolute inset-0 z-0 rounded-[1.5rem]",
          featured &&
            "cursor-pointer rounded-[1.25rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
        aria-label={`View ${title}`}
      />

      <div className="relative">
        <button
          type="button"
          onClick={handleFavorite}
          aria-label={favorited ? `Remove ${title} from favorites` : `Save ${title} to favorites`}
          aria-pressed={favorited}
          className={cn(
            "absolute right-3 top-3 z-20 flex size-11 cursor-pointer items-center justify-center rounded-full border border-border bg-surface-light text-gray-secondary shadow-soft backdrop-blur-md transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            featured && "right-4 top-4",
          )}
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
          <span
            className={cn(
              "absolute left-3 top-3 z-20 rounded-full bg-action/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-action-foreground shadow-soft",
              featured && "left-4 top-4",
            )}
          >
            Popular
          </span>
        )}

        <Link
          href={productHref}
          className="pointer-events-none block"
          aria-hidden="true"
          tabIndex={-1}
        >
          <div
            data-product-art={featured ? "true" : undefined}
            className={
              featured
                ? "relative aspect-[3/1] max-h-[220px] w-full overflow-clip"
                : "relative h-56 w-full overflow-hidden"
            }
          >
            <Image
              src={image}
              alt={title}
              fill
              sizes={
                featured
                  ? "(min-width: 981px) 50vw, 100vw"
                  : "(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
              }
              className={cn(
                "object-contain",
                featured ? "p-4" : "p-6",
                !prefersReducedMotion &&
                  "transition-transform duration-[180ms] ease-out-quart group-hover:scale-[1.03]",
              )}
            />
          </div>
        </Link>
      </div>

      <div
        className={
          featured
            ? "pointer-events-none relative z-10 flex flex-1 flex-col p-0 pt-3"
            : "pointer-events-none relative z-10 flex flex-1 flex-col p-5 pt-3"
        }
      >
        <h3
          className={
            featured
              ? "mb-1.5 line-clamp-1 font-display text-2xl font-semibold tracking-[-0.02em] text-gray-primary"
              : "mb-1.5 line-clamp-1 text-lg font-semibold tracking-tight text-gray-primary"
          }
        >
          {title}
        </h3>
        <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-gray-tertiary">
          {description}
        </p>

        <div
          className={cn(
            "mt-5 flex items-center justify-between gap-3",
            featured && "mt-2",
          )}
        >
          <span
            className={
              featured
                ? "font-display text-2xl tabular-nums tracking-tight text-accent-text"
                : "text-xl font-semibold tabular-nums tracking-tight text-gray-secondary"
            }
          >
            {formatCents(priceCents)}
          </span>
          <Button
            size="icon"
            className="pointer-events-auto relative z-20 size-11 rounded-full bg-action text-action-foreground shadow-soft hover:bg-action-hover"
            onClick={handleAddToCart}
            aria-label={`Add ${title} to cart`}
          >
            <Plus className="size-5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
