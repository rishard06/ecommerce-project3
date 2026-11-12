import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ReviewListItem {
  id: string;
  rating: number;
  comment: string;
  createdAt: string | Date;
  userName?: string;
}

interface ReviewListProps {
  reviews: ReviewListItem[];
}

function formatDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toDateTime(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function ReviewList({ reviews }: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <div className="glass-component rounded-[1.75rem] p-8 text-center text-sm text-gray-tertiary">
        No reviews yet. Be the first to share your experience.
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {reviews.map((review) => (
        <li
          key={review.id}
          className="glass-component rounded-[1.75rem] p-6 md:p-7"
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-primary">
                {review.userName ?? "Verified buyer"}
              </span>
              <span
                className="flex gap-0.5"
                role="img"
                aria-label={`Rated ${review.rating} out of 5`}
              >
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    className={cn(
                      "size-3.5",
                      index < review.rating
                        ? "fill-yellow-500 text-yellow-500"
                        : "text-gray-quaternary"
                    )}
                    aria-hidden="true"
                  />
                ))}
              </span>
            </div>
            <time
              dateTime={toDateTime(review.createdAt)}
              className="text-xs font-medium uppercase tracking-wider text-gray-quaternary"
            >
              {formatDate(review.createdAt)}
            </time>
          </div>
          <p className="leading-relaxed text-gray-secondary">{review.comment}</p>
        </li>
      ))}
    </ul>
  );
}
