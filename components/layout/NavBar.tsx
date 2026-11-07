"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { HeartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavoritesStore } from "@/lib/store/favorites-store";
import { CartBadge } from "@/features/cart/components/CartBadge";

import Logo from "./Logo";
import Search from "./Search";
import CartAction from "@/features/cart/components/CartAction";
import UserAction from "./UserAction";
import MobileMenu from "./MobileMenu";

export default function NavBar() {
  const items = useFavoritesStore((state) => state.items);
  const [mounted, setMounted] = useState(false);
  const [favCount, setFavCount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) setFavCount(items.length);
  }, [items, mounted]);

  return (
    <nav
      aria-label="Primary"
      className="sticky top-0 z-50 w-full px-3 pt-3 sm:px-5 md:pt-4"
    >
      {/* Floating bar: translucency here separates navigation from content. */}
      <div className="glass-control mx-auto flex w-full max-w-7xl items-center justify-between gap-2 rounded-full px-3 py-2 sm:gap-4 sm:px-4 md:gap-8 md:py-2.5">
        <Logo />

        {/* Mobile menu (includes trigger, backdrop and sheet) */}
        <MobileMenu />

        {/* Desktop navigation */}
        <div className="hidden flex-1 items-center justify-end gap-1 md:flex md:gap-2">
          <Search />

          <Button
            asChild
            variant="ghost"
            size="icon"
            className="rounded-full text-gray-secondary hover:bg-gray-primary/5"
          >
            <Link href="/favorites" aria-label={`Favorites, ${favCount} saved`}>
              <HeartIcon className="size-5" aria-hidden="true" />
              <CartBadge count={favCount} />
            </Link>
          </Button>

          <CartAction />

          <UserAction />
        </div>
      </div>
    </nav>
  );
}
