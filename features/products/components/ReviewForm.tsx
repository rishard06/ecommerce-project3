"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { submitReview } from "../actions";
import { useSession } from "@/lib/auth-client";
import Link from "next/link";

interface ReviewFormProps {
  productSlug: string;
}

export function ReviewForm({ productSlug }: ReviewFormProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitted(false);

    startTransition(async () => {
      try {
        await submitReview(productSlug, rating, comment);
        setComment("");
        setRating(5);
        setSubmitted(true);
        router.refresh();
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not submit your review. Please try again."
        );
      }
    });
  }

  if (!session?.user) {
    return (
      <div className="glass-component rounded-[1.75rem] p-6 text-center md:p-8">
        <h3 className="mb-1.5 text-lg font-semibold text-gray-primary">
          Write a review
        </h3>
        <p className="mb-5 text-sm text-gray-tertiary">
          Sign in to share what you think of this product.
        </p>
        <Link
          href="/login"
          className="inline-flex h-11 items-center justify-center rounded-full bg-gray-primary px-6 font-semibold text-white transition-colors hover:bg-gray-secondary"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-component rounded-[1.75rem] p-6 md:p-8"
    >
      <h3 className="mb-1.5 text-lg font-semibold text-gray-primary">
        Write a review
      </h3>
      <p className="mb-5 text-sm text-gray-tertiary">
        Share what you think of this product.
      </p>

      <fieldset className="mb-5">
        <legend className="mb-2 text-sm font-semibold text-gray-primary">
          Rating
        </legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              aria-label={`${value} star${value === 1 ? "" : "s"}`}
              aria-pressed={rating === value}
              className="rounded-md p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Star
                className={cn(
                  "size-6",
                  value <= rating
                    ? "fill-yellow-500 text-yellow-500"
                    : "text-gray-quaternary"
                )}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mb-5">
        <label
          htmlFor="review-comment"
          className="mb-2 block text-sm font-semibold text-gray-primary"
        >
          Comment
        </label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={4}
          maxLength={1000}
          required
          placeholder="How does it feel day to day?"
          className="w-full rounded-2xl border border-gray-primary/15 bg-white/60 px-4 py-3 text-sm text-gray-primary placeholder:text-gray-quaternary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {error ? (
        <p role="alert" className="mb-4 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      {submitted ? (
        <p role="status" className="mb-4 text-sm font-medium text-accent-700">
          Thank you — your review has been posted.
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={isPending || comment.trim().length === 0}
        className="h-11 rounded-full bg-accent-500 px-6 font-semibold text-gray-primary hover:bg-accent-600"
      >
        {isPending ? "Posting…" : "Post review"}
      </Button>
    </form>
  );
}
