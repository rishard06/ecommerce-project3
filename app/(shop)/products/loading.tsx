import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:gap-8 lg:px-8">
      <div className="glass-component h-min w-full p-6 lg:w-1/4">
        <Skeleton className="mb-4 h-3 w-24 rounded-full" />
        <div className="flex flex-col gap-1">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-full" />
          ))}
        </div>
      </div>

      <div className="glass-component flex w-full flex-col p-5 sm:p-6 md:p-8 lg:w-3/4">
        <div className="mb-7 flex items-end justify-between gap-4">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-32 rounded-full" />
        </div>
        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex h-96 flex-col rounded-[1.5rem] border border-white/40 bg-white/40 p-4"
            >
              <Skeleton className="mb-4 h-48 w-full rounded-2xl" />
              <Skeleton className="mb-2 h-5 w-3/4 rounded-full" />
              <Skeleton className="mb-4 h-3.5 w-full rounded-full" />
              <div className="mt-auto flex items-center justify-between">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="size-11 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
