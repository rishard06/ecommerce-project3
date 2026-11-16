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

/**
 * Distance scrolled before the bar trades its transparent treatment for the
 * glass material. Past this point content begins sliding under the bar.
 */
export const HERO_SCROLL_THRESHOLD = 24;

export default function NavBar() {
  const items = useFavoritesStore((state) => state.items);
  const [mounted, setMounted] = useState(false);
  const [favCount, setFavCount] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const syncMaterial = () => {
      setIsScrolled(window.scrollY > HERO_SCROLL_THRESHOLD);
    };

    syncMaterial();
    window.addEventListener("scroll", syncMaterial, { passive: true });
    return () => window.removeEventListener("scroll", syncMaterial);
  }, []);

  useEffect(() => {
    if (mounted) setFavCount(items.length);
  }, [items, mounted]);

  return (
    <nav
      aria-label="Primary"
      className={`sticky top-0 z-50 w-full px-3 sm:px-5 print:hidden ${
        // Half the announcement height (h-9 = 36px): breathing room once the
        // bar scrolls away and the pill sticks; flush under the message at top.
        isScrolled ? "mt-[18px]" : ""
      }`}
    >
      {/* Floating bar: transparent over the hero, glass once content slides under. Flush under the announcement bar. */}
      <div
        className={`mx-auto flex w-full max-w-7xl items-center justify-between gap-2 rounded-full px-3 py-2 sm:gap-4 sm:px-4 md:gap-8 md:py-2.5 ${
          isScrolled
            ? "glass-control"
            : "border border-transparent bg-transparent"
        }`}
      >
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
            <Link
              href="/favorites"
              aria-label={`Favorites, ${favCount} saved`}
              className="relative"
            >
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
