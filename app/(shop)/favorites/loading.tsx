import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function FavoritesLoading() {
  return (
    <div className="min-h-screen pt-40 pb-20 px-4 md:px-10 lg:px-20 max-w-7xl mx-auto">
      <div className="space-y-4 mb-12">
        <Skeleton className="h-6 w-32 rounded-full" />
        <div className="flex items-end gap-4">
          <Skeleton className="h-16 w-64 md:h-20 md:w-96 rounded-2xl" />
        </div>
        <Skeleton className="h-4 w-full max-w-2xl rounded-full" />
        <Skeleton className="h-4 w-3/4 max-w-xl rounded-full" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-56 w-full rounded-3xl" />
            <Skeleton className="h-6 w-3/4 rounded-full mx-auto" />
            <Skeleton className="h-4 w-1/2 rounded-full mx-auto" />
            <div className="flex justify-between items-center px-2">
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="size-12 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
