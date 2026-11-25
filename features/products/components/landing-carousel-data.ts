/**
 * View mapping for the landing carousel.
 *
 * Kept free of React and server-only imports so the mapping (row → slide) can
 * be tested on its own and the client carousel only receives serializable data.
 */

import type { StorefrontProductSummary } from "@/features/catalog/server/catalog-view";
import { formatCents } from "@/lib/money";

/** Slides requested for the landing carousel. */
export const LANDING_CAROUSEL_LIMIT = 8;

/** One carousel slide; `image: null` means "render the placeholder". */
export interface LandingCarouselSlide {
  slug: string;
  title: string;
  description: string;
  categoryName: string;
  price: string;
  image: string | null;
  alt: string;
}

function toSlide(product: StorefrontProductSummary): LandingCarouselSlide {
  const image = product.image.trim();

  return {
    slug: product.slug,
    title: product.title,
    description: product.description,
    categoryName: product.categoryName,
    price: formatCents(product.priceCents),
    image: image === "" ? null : image,
    alt: `${product.title} — ${product.categoryName}`,
  };
}

/**
 * Maps the featured summaries to slides, preserving the query order (rating
 * desc, slug asc). Products without an image keep a slide and use the
 * placeholder, so the carousel never shows a broken image.
 */
export function toLandingCarouselSlides(
  products: StorefrontProductSummary[],
): LandingCarouselSlide[] {
  return products.slice(0, LANDING_CAROUSEL_LIMIT).map(toSlide);
}
