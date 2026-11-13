"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/features/identity/server/guards";

const reviewInputSchema = z.object({
  productSlug: z.string().trim().min(1, "A valid product is required"),
  rating: z
    .number()
    .int()
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5"),
  comment: z
    .string()
    .trim()
    .min(1, "Please write a short comment")
    .max(1000, "Comment must be 1000 characters or fewer"),
});

export interface StoredReview {
  id: string;
  productSlug: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

interface ReviewDelegate {
  findMany: (args: unknown) => Promise<StoredReview[]>;
  findFirst: (args: unknown) => Promise<StoredReview | null>;
  create: (args: unknown) => Promise<StoredReview>;
}

function getReviewDelegate(): ReviewDelegate | null {
  const delegate = (prisma as unknown as { review?: ReviewDelegate }).review;
  if (!delegate) {
    console.error(
      "prisma.review is undefined — generated client is stale. Run: npx prisma generate",
    );
    return null;
  }
  return delegate;
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002"
  );
}

/** Reads the `[{ rating, ... }]` seed baseline stored on `Product.reviews`. */
function seedRatings(reviews: unknown): number[] {
  if (!Array.isArray(reviews)) return [];

  return reviews.flatMap((review) => {
    if (!review || typeof review !== "object") return [];
    const rating = (review as { rating?: unknown }).rating;
    return typeof rating === "number" && Number.isFinite(rating) ? [rating] : [];
  });
}

/**
 * Recomputes `Product.rating` as the mean of the seed review baseline plus
 * every persisted customer review, rounded to two decimals. `Product` has no
 * count column: catalog-view derives the display count from the seed array
 * plus Prisma's `_count.userReviews`.
 */
async function recomputeProductRating(productSlug: string, seedReviewJson: unknown) {
  const delegate = getReviewDelegate();
  if (!delegate) return;

  const userReviews = await delegate.findMany({
    where: { productSlug },
    select: { rating: true },
  });

  const ratings = [
    ...seedRatings(seedReviewJson),
    ...userReviews.map((review) => review.rating),
  ];
  if (ratings.length === 0) return;

  const total = ratings.reduce((sum, value) => sum + value, 0);
  const average = Math.round((total / ratings.length) * 100) / 100;

  await prisma.product.update({
    where: { slug: productSlug },
    data: { rating: average },
  });
}

export async function submitReview(
  productSlug: string,
  rating: number,
  comment: string,
) {
  const user = await requireUser();

  const parsed = reviewInputSchema.safeParse({ productSlug, rating, comment });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid review");
  }

  const delegate = getReviewDelegate();
  if (!delegate) {
    throw new Error("Reviews are unavailable. Run: npx prisma generate");
  }

  const data = parsed.data;

  const product = await prisma.product.findUnique({
    where: { slug: data.productSlug },
    select: { reviews: true },
  });
  if (!product) {
    throw new Error("Product not found. It may have been removed.");
  }

  const existing = await delegate.findFirst({
    where: { productSlug: data.productSlug, userId: user.id },
  });
  if (existing) {
    throw new Error("You have already reviewed this product.");
  }

  try {
    const created = await delegate.create({
      data: {
        productSlug: data.productSlug,
        rating: data.rating,
        comment: data.comment,
        userId: user.id,
      },
    });

    await recomputeProductRating(data.productSlug, product.reviews);
    return created;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new Error("You have already reviewed this product.");
    }
    throw error;
  }
}

export async function getProductReviews(productSlug: string): Promise<StoredReview[]> {
  const delegate = getReviewDelegate();
  if (!delegate) return [];

  try {
    return await delegate.findMany({
      where: { productSlug },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  } catch {
    return [];
  }
}
