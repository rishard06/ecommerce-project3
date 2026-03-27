import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="h-[calc(100vh-136px)] mx-4 md:mx-10 flex flex-col lg:flex-row justify-center gap-8 py-8">
      {/* Sidebar Skeleton */}
      <div className="h-min w-full lg:w-1/4 bg-white/60 backdrop-blur-md rounded-3xl shadow-lg p-6 border border-white/20">
        <Skeleton className="h-7 w-32 mb-6 bg-gray-200" />
        <div className="flex flex-col gap-2">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-11 w-full rounded-full bg-gray-100" />
          ))}
        </div>
      </div>

      {/* Grid Skeleton */}
      <div className="w-full lg:w-3/4 bg-white/60 backdrop-blur-md rounded-3xl shadow-lg p-6 md:p-8 border border-white/20 flex flex-col">
        <div className="flex justify-between items-center mb-8">
          <Skeleton className="h-9 w-48 bg-gray-200" />
          <Skeleton className="h-5 w-32 bg-gray-100" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mb-10">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white/50 rounded-3xl p-4 shadow-sm border border-white/20 h-96 flex flex-col">
              <Skeleton className="w-full h-48 rounded-2xl mb-4 bg-gray-200" />
              <Skeleton className="h-6 w-3/4 mb-2 bg-gray-200" />
              <Skeleton className="h-4 w-full mb-4 bg-gray-100" />
              <div className="mt-auto flex justify-between items-center">
                <Skeleton className="h-7 w-20 bg-gray-200" />
                <Skeleton className="h-12 w-12 rounded-full bg-accent-500/30" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
