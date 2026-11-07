import React from "react";

export default function ProductLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 p-8"
    >
      <div className="relative size-8">
        <div className="absolute inset-0 rounded-full border-2 border-gray-primary/10" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
      <p className="text-sm font-medium text-gray-tertiary">Loading product…</p>
    </div>
  );
}
