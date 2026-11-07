/**
 * View mapping from owned-catalog Prisma rows to storefront view models.
 *
 * The storefront never reads DummyJSON at runtime; these types are the shape
 * the product pages and cards consume. Money is integer cents (USD) end to
 * end; `formatCents` renders it.
 */

import type { Prisma } from "@/app/generated/prisma";

/**
 * Shared include for storefront reads: category, position-ordered images,
 * and variants.
 */
export const PRODUCT_INCLUDE = {
  category: true,
  images: { orderBy: { position: "asc" } },
  variants: true,
} as const;

/** Row shape returned by every storefront product query. */
export type CatalogProductRow = Prisma.ProductGetPayload<{
  include: typeof PRODUCT_INCLUDE;
}>;

/** A purchasable catalog variant as the storefront sees it. */
export interface StorefrontVariantView {
  id: string;
  sku: string;
  priceCents: number;
  onHand: number;
}

/** A seed review ({ rating, comment, date, reviewerName }) rendered for display. */
export interface ReviewView {
  id: string;
  userName: string;
  rating: number;
  date: string;
  title: string;
  content: string;
}

/** Card/grid view of an active product. */
export interface StorefrontProductSummary {
  slug: string;
  title: string;
  description: string;
  priceCents: number;
  image: string;
  rating: number;
  categorySlug: string;
  categoryName: string;
  defaultVariantId: string;
  isPopular: boolean;
}

/** Detail view of an active product: the summary minus `image`, plus relations. */
export interface StorefrontProduct extends Omit<StorefrontProductSummary, "image"> {
  images: string[];
  features: string[];
  reviews: ReviewView[];
  reviewCount: number;
  variants: StorefrontVariantView[];
  defaultVariant: StorefrontVariantView;
}

/** Ratings strictly above this threshold render the "Popular" badge. */
const POPULAR_RATING_THRESHOLD = 4.5;

interface StoredReview {
  rating?: unknown;
  comment?: unknown;
  date?: unknown;
  reviewerName?: unknown;
}

/**
 * Default variant selection: the flagged default when present, otherwise the
 * first variant. Products with no variant at all are unpurchasable and are
 * excluded from every storefront read (callers treat a null variant as "skip").
 */
function defaultVariantOf(row: CatalogProductRow): StorefrontVariantView | null {
  const variant = row.variants.find((candidate) => candidate.isDefault) ?? row.variants[0];
  if (!variant) return null;

  return {
    id: variant.id,
    sku: variant.sku,
    priceCents: variant.priceCents,
    onHand: variant.onHand,
  };
}

function toVariantView(variant: CatalogProductRow["variants"][number]): StorefrontVariantView {
  return {
    id: variant.id,
    sku: variant.sku,
    priceCents: variant.priceCents,
    onHand: variant.onHand,
  };
}

/**
 * Maps the raw seed review JSON to display views. Non-array values (null on
 * admin-created products) mean "no reviews".
 */
function toReviewViews(reviews: Prisma.JsonValue): ReviewView[] {
  if (!Array.isArray(reviews)) return [];

  return reviews.map((review, index) => {
    const stored = (review ?? {}) as StoredReview;
    const rating = typeof stored.rating === "number" ? stored.rating : 0;

    return {
      id: `rev-${index}`,
      userName: typeof stored.reviewerName === "string" ? stored.reviewerName : "Anonymous",
      rating,
      date:
        typeof stored.date === "string" ? new Date(stored.date).toLocaleDateString("en-US") : "",
      // Seed reviews carry no title; derive one from the rating as the UI always has.
      title: rating >= 4 ? "Great Product" : "Feedback",
      content: typeof stored.comment === "string" ? stored.comment : "",
    };
  });
}

/** Maps a row to a card/grid summary, or null when the product has no variant. */
export function toSummary(row: CatalogProductRow): StorefrontProductSummary | null {
  const defaultVariant = defaultVariantOf(row);
  if (!defaultVariant) return null;

  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    priceCents: defaultVariant.priceCents,
    image: row.images[0]?.url ?? "",
    rating: row.rating,
    categorySlug: row.category.slug,
    categoryName: row.category.name,
    defaultVariantId: defaultVariant.id,
    isPopular: row.rating > POPULAR_RATING_THRESHOLD,
  };
}

/** Maps a row to a detail view, or null when the product has no variant. */
export function toDetail(row: CatalogProductRow): StorefrontProduct | null {
  const defaultVariant = defaultVariantOf(row);
  if (!defaultVariant) return null;

  const reviews = toReviewViews(row.reviews);

  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    priceCents: defaultVariant.priceCents,
    rating: row.rating,
    categorySlug: row.category.slug,
    categoryName: row.category.name,
    defaultVariantId: defaultVariant.id,
    isPopular: row.rating > POPULAR_RATING_THRESHOLD,
    images: row.images.map((image) => image.url),
    features: row.features,
    reviews,
    reviewCount: reviews.length,
    variants: row.variants.map(toVariantView),
    defaultVariant,
  };
}
