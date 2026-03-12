import * as React from 'react';
import { Star, ThumbsUp, Reply, StarHalf } from 'lucide-react';
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
  // Calculate real distribution
  const distribution = [5, 4, 3, 2, 1].map(stars => {
    const count = reviews.filter(r => r.rating === stars).length;
    const percentage = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
    return { stars, percentage };
  });

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="size-5 fill-yellow-400 text-yellow-300" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<StarHalf key={i} className="size-5 fill-yellow-400 text-yellow-300" />);
      } else {
        stars.push(<Star key={i} className="size-5 text-slate-300 dark:text-gray-quaternary" />);
      }
    }
    return stars;
  };

  return (
    <div className="mt-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div>
          <h2 className="text-4xl font-black mb-2 tracking-tight text-gray-primary">Customer Reviews</h2>
          <p className="text-gray-tertiary font-medium">What our community says about this product</p>
        </div>
        <Button className="bg-accent-500 hover:bg-accent-600 text-gray-secondary px-8 py-3 rounded-2xl font-bold shadow-lg shadow-accent-500/10 transition-all h-auto active:scale-95 hover:cursor-pointer">
          Write a Review
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-16">
        <div className="lg:w-1/3 flex flex-col gap-6">
          <div className="p-8 rounded-3xl glass-component border border-white/40 shadow-2xl shadow-black/5 sticky top-24">
            <p className="text-7xl font-black text-slate-900 dark:text-gray-primary mb-2 tracking-tighter">{rating}</p>
            <div className="flex gap-1 mb-4">
              {renderStars(rating)}
            </div>
            <p className="text-gray-tertiary text-sm font-medium mb-8">Based on {totalReviews.toLocaleString()} verified purchases</p>
            <div className="space-y-4">
              {distribution.map((dist) => (
                <div key={dist.stars} className="grid grid-cols-[20px_1fr_40px] items-center gap-4">
                  <p className="text-sm font-bold text-gray-secondary">{dist.stars}</p>
                  <Progress value={dist.percentage} className="h-2 bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden" indicatorClassName="bg-accent-500 transition-all duration-500 ease-out" />
                  <p className="text-xs font-bold text-gray-tertiary text-right">{dist.percentage}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:w-2/3 space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="flex flex-col gap-5 p-8 rounded-3xl glass-component border border-white/40 shadow-xl shadow-black/5 hover:scale-[1.01] transition-transform duration-300">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <Avatar className="size-12 ring-2 ring-white/50 border border-slate-200 dark:border-gray-quaternary">
                    <AvatarImage src={review.userAvatar} alt={review.userName} />
                    <AvatarFallback className="bg-accent-500/40 text-accent-700 font-black">{review.userName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-gray-primary">{review.userName}</p>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "size-3",
                            i < review.rating ? "fill-yellow-400 text-yellow-300" : "text-slate-200 dark:text-gray-quaternary"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <span className="text-gray-tertiary text-xs font-bold uppercase tracking-wider">{review.date}</span>
              </div>
              <div>
                <h4 className="font-black text-xl text-slate-900 dark:text-gray-secondary mb-2">{review.title}</h4>
                <p className="text-slate-600 dark:text-gray-tertiary leading-relaxed font-medium">
                  {review.content}
                </p>
              </div>
              <div className="flex items-center gap-6 pt-2">
                <button className="flex items-center gap-2 text-xs font-black text-gray-tertiary hover:text-accent-700 transition-colors cursor-pointer group">
                  <div className="size-8 rounded-lg bg-accent-500/40 flex items-center justify-center group-hover:bg-accent-500/60 transition-colors">
                    <ThumbsUp className="size-4 text-accent-700 dark:text-accent-400" />
                  </div>
                  Helpful ({review.helpfulCount})
                </button>
                <button className="flex items-center gap-2 text-xs font-black text-gray-tertiary hover:text-accent-700 transition-colors cursor-pointer group">
                  <div className="size-8 rounded-lg bg-accent-500/40 flex items-center justify-center group-hover:bg-accent-500/60 transition-colors">
                    <Reply className="size-4 text-accent-700 dark:text-accent-400" />
                  </div>
                  Reply
                </button>
              </div>
            </div>
          ))}
          <Button variant="outline" className="w-full py-6 rounded-full border-gray-tertiary dark:border-gray-tertiary text-gray-tertiary dark:text-gray-secondary font-bold hover:bg-white/50 dark:hover:bg-gray-quaternary backdrop-blur-sm transition-all h-auto text-lg active:scale-[0.98] hover:cursor-pointer">
            Load More Reviews
          </Button>
        </div>
      </div>
    </div>
  );
}
