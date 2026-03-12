import * as React from 'react';
import { Star, ThumbsUp, Reply } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Review } from '../types';

interface CustomerReviewsProps {
  reviews: Review[];
  rating: number;
  totalReviews: number;
}

export function CustomerReviews({ reviews, rating, totalReviews }: CustomerReviewsProps) {
  const ratingDistribution = [
    { stars: 5, percentage: 80 },
    { stars: 4, percentage: 15 },
    { stars: 3, percentage: 3 },
    { stars: 2, percentage: 1 },
    { stars: 1, percentage: 1 },
  ];

  return (
    <div className="mt-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div>
          <h2 className="text-3xl font-black mb-2">Customer Reviews</h2>
          <p className="text-slate-500">What our community says about this product</p>
        </div>
        <Button className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-all h-auto">
          Write a Review
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-16">
        <div className="lg:w-1/3 flex flex-col gap-6">
          <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-6xl font-black text-slate-900 dark:text-white mb-2">{rating}</p>
            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="size-5 fill-accent-500 text-accent-500" />
              ))}
            </div>
            <p className="text-slate-500 text-sm mb-8">Based on {totalReviews.toLocaleString()} verified purchases</p>
            <div className="space-y-4">
              {ratingDistribution.map((dist) => (
                <div key={dist.stars} className="grid grid-cols-[20px_1fr_40px] items-center gap-4">
                  <p className="text-sm font-bold">{dist.stars}</p>
                  <Progress value={dist.percentage} className="h-2 bg-slate-100 dark:bg-slate-800" indicatorClassName="bg-accent-500" />
                  <p className="text-xs text-slate-500 text-right">{dist.percentage}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:w-2/3 space-y-10">
          {reviews.map((review) => (
            <div key={review.id} className="flex flex-col gap-4 pt-10 first:pt-0 border-t first:border-t-0 border-slate-200 dark:border-slate-800">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <Avatar className="size-12">
                    <AvatarImage src={review.userAvatar} alt={review.userName} />
                    <AvatarFallback className="bg-slate-200 dark:bg-slate-800">{review.userName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold">{review.userName}</p>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "size-3",
                            i < review.rating ? "fill-accent-500 text-accent-500" : "text-slate-300 dark:text-slate-600"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <span className="text-slate-400 text-sm">{review.date}</span>
              </div>
              <h4 className="font-bold text-lg">{review.title}</h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {review.content}
              </p>
              <div className="flex items-center gap-6 mt-2">
                <button className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-accent-500 transition-colors cursor-pointer">
                  <ThumbsUp className="size-4" />
                  Helpful ({review.helpfulCount})
                </button>
                <button className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-accent-500 transition-colors cursor-pointer">
                  <Reply className="size-4" />
                  Reply
                </button>
              </div>
            </div>
          ))}
          <Button variant="outline" className="w-full py-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all h-auto">
            Load More Reviews
          </Button>
        </div>
      </div>
    </div>
  );
}
