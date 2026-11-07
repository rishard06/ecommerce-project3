import * as React from "react";
import { Star, ThumbsUp, Reply, StarHalf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Review } from "../types";

interface CustomerReviewsProps {
  reviews: Review[];
  rating: number;
  totalReviews: number;
}

export function CustomerReviews({ reviews, rating, totalReviews }: CustomerReviewsProps) {
  const distribution = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((review) => review.rating === stars).length;
    const percentage =
      reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
    return { stars, percentage };
  });

  const renderStars = (value: number) => {
    const stars = [];
    const fullStars = Math.floor(value);
    const hasHalfStar = value % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Star key={i} className="size-4 fill-yellow-500 text-yellow-500" aria-hidden="true" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <StarHalf key={i} className="size-4 fill-yellow-500 text-yellow-500" aria-hidden="true" />
        );
      } else {
        stars.push(
          <Star key={i} className="size-4 text-gray-quaternary" aria-hidden="true" />
        );
      }
    }
    return stars;
  };

  return (
    <section id="customer-reviews" className="mt-24 scroll-mt-28">
      <div className="mb-8 flex flex-col items-start justify-between gap-5 md:mb-10 md:flex-row md:items-end">
        <div>
          <h2 className="mb-1.5 text-3xl font-semibold tracking-tight text-gray-primary md:text-4xl">
            Customer reviews
          </h2>
          <p className="text-gray-tertiary">
            What people who bought this actually think.
          </p>
        </div>
        <Button className="h-11 rounded-full bg-accent-500 px-6 font-semibold text-gray-primary shadow-soft hover:bg-accent-600">
          Write a review
        </Button>
      </div>

      <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
        <div className="lg:w-1/3">
          <div className="glass-component sticky top-24 rounded-[1.75rem] p-6 md:p-8">
            <p className="mb-1 text-6xl font-semibold tabular-nums tracking-tight text-gray-primary">
              {rating}
            </p>
            <div
              className="mb-3 flex gap-0.5"
              role="img"
              aria-label={`Rated ${rating} out of 5`}
            >
              {renderStars(rating)}
            </div>
            <p className="mb-7 text-sm font-medium text-gray-tertiary">
              Based on {totalReviews.toLocaleString()} verified purchases
            </p>
            <div className="space-y-3">
              {distribution.map((dist) => (
                <div
                  key={dist.stars}
                  className="grid grid-cols-[16px_1fr_40px] items-center gap-3"
                >
                  <p className="text-xs font-semibold tabular-nums text-gray-secondary">
                    {dist.stars}
                  </p>
                  <Progress
                    value={dist.percentage}
                    aria-label={`${dist.stars} star reviews`}
                    className="h-1.5 overflow-hidden rounded-full bg-gray-primary/10"
                    indicatorClassName="bg-accent-500"
                  />
                  <p className="text-right text-xs font-semibold tabular-nums text-gray-tertiary">
                    {dist.percentage}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 lg:w-2/3">
          {reviews.length === 0 ? (
            <div className="glass-component rounded-[1.75rem] p-8 text-center text-sm text-gray-tertiary">
              No reviews yet. Be the first to share your experience.
            </div>
          ) : (
            reviews.map((review) => (
              <article
                key={review.id}
                className="glass-component flex flex-col gap-4 rounded-[1.75rem] p-6 md:p-8"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-11 ring-1 ring-white/60">
                      <AvatarImage src={review.userAvatar} alt="" />
                      <AvatarFallback className="bg-accent-500/25 font-semibold text-accent-700">
                        {review.userName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-gray-primary">
                        {review.userName}
                      </p>
                      <div
                        className="flex gap-0.5"
                        role="img"
                        aria-label={`Rated ${review.rating} out of 5`}
                      >
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={index}
                            className={cn(
                              "size-3",
                              index < review.rating
                                ? "fill-yellow-500 text-yellow-500"
                                : "text-gray-quaternary"
                            )}
                            aria-hidden="true"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-medium uppercase tracking-wider text-gray-quaternary">
                    {review.date}
                  </span>
                </div>
                <div>
                  <h3 className="mb-1.5 text-lg font-semibold text-gray-primary">
                    {review.title}
                  </h3>
                  <p className="leading-relaxed text-gray-secondary">
                    {review.content}
                  </p>
                </div>
                <div className="flex items-center gap-5 pt-1">
                  <button
                    type="button"
                    className="flex items-center gap-2 text-xs font-semibold text-gray-tertiary transition-colors hover:text-gray-primary"
                  >
                    <span className="flex size-8 items-center justify-center rounded-lg bg-accent-500/20">
                      <ThumbsUp className="size-3.5 text-accent-700" aria-hidden="true" />
                    </span>
                    Helpful ({review.helpfulCount})
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 text-xs font-semibold text-gray-tertiary transition-colors hover:text-gray-primary"
                  >
                    <span className="flex size-8 items-center justify-center rounded-lg bg-accent-500/20">
                      <Reply className="size-3.5 text-accent-700" aria-hidden="true" />
                    </span>
                    Reply
                  </button>
                </div>
              </article>
            ))
          )}
          <Button
            variant="outline"
            className="h-12 w-full rounded-full border-gray-primary/15 bg-white/40 text-base font-semibold text-gray-secondary hover:bg-white/70"
          >
            Load more reviews
          </Button>
        </div>
      </div>
    </section>
  );
}
