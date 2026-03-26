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
      onSubmit={handleSearch}
      className="flex-1 max-w-md bg-white/30 rounded-full"
    >
      <div className="relative flex items-center">
        <Input
          type="search"
          placeholder="Search products..."
          className="w-full pl-10 rounded-full border-none focus-visible:ring-1 bg-white/30"
        />
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-quaternary" />
      </div>
    </form>
  );
}
