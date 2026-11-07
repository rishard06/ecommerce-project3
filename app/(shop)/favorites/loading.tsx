import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function FavoritesLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <div className="mb-8 space-y-3 md:mb-12">
        <Skeleton className="h-3 w-20 rounded-full" />
        <Skeleton className="h-10 w-64 rounded-xl md:h-14 md:w-96" />
        <Skeleton className="h-4 w-40 rounded-full" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="glass-component flex flex-col gap-3 p-4">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-5 w-3/4 rounded-full" />
            <Skeleton className="h-3.5 w-full rounded-full" />
            <div className="flex items-center justify-between pt-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="size-11 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
