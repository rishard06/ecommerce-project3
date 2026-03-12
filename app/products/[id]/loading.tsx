import React from "react";

export default function Loading() {
  return (
    <div className="min-h-[calc(100vh-136px)] w-full flex flex-col items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4">
        <div className="relative size-16">
          <div className="absolute inset-0 border-4 border-accent-500/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-accent-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-secondary font-bold animate-pulse">Loading Product Details...</p>
      </div>
    </div>
  );
}
