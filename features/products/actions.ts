"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";

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

export async function submitReview(
  productSlug: string,
  rating: number,
  comment: string,
  userId?: string,
) {
  if (!userId || userId === "guest") {
    throw new Error("Please sign in to write a review.");
  }

  const parsed = reviewInputSchema.safeParse({ productSlug, rating, comment });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid review");
  }

  const delegate = getReviewDelegate();
  if (!delegate) {
    throw new Error("Reviews are unavailable. Run: npx prisma generate");
  }

  const data = parsed.data;

  const existing = await delegate.findFirst({
    where: { productSlug: data.productSlug, userId },
  });
  if (existing) {
    throw new Error("You have already reviewed this product.");
  }

  try {
    return await delegate.create({
      data: {
        productSlug: data.productSlug,
        rating: data.rating,
        comment: data.comment,
        userId,
      },
    });
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
