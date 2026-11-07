"use client";

import React from "react";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Search() {
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <form
      role="search"
      onSubmit={handleSearch}
      className="flex-1 max-w-md"
      aria-label="Product search"
    >
      <div className="relative flex items-center">
        <label htmlFor="site-search" className="sr-only">
          Search products
        </label>
        <SearchIcon
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-tertiary"
          aria-hidden="true"
        />
        <Input
          id="site-search"
          type="search"
          placeholder="Search products…"
          className="h-10 w-full rounded-full border-transparent bg-surface-dark/60 pl-10 pr-4 text-sm text-foreground placeholder:text-gray-quaternary transition-colors hover:bg-surface-dark focus-visible:bg-white/70"
        />
      </div>
    </form>
  );
}
