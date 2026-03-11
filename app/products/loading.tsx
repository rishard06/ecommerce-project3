import React from "react";

export default function Loading() {
  return (
    <div className="h-[calc(100vh-136px)] mx-10 flex flex-col lg:flex-row justify-center gap-8">
      {/* Sidebar Skeleton */}
      <div className="h-min w-full lg:w-1/4 bg-white/60 rounded-3xl shadow-md p-4 animate-pulse">
        <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
        <div className="flex flex-col gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 w-full bg-gray-100 rounded-full"></div>
          ))}
        </div>
      </div>

      {/* Grid Skeleton */}
      <div className="w-full lg:w-3/4 bg-white/60 rounded-3xl shadow-md p-6 overflow-y-auto">
        <div className="h-8 w-48 bg-gray-200 rounded mb-8 animate-pulse"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 h-80 animate-pulse">
              <div className="w-full h-40 bg-gray-200 rounded-2xl mb-4"></div>
              <div className="h-6 w-3/4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 w-full bg-gray-100 rounded mb-4"></div>
              <div className="flex justify-between items-center mt-auto">
                <div className="h-6 w-16 bg-gray-200 rounded"></div>
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
