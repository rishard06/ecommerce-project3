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
  const { getTotalItems } = useFavoritesStore();
  const [favCount, setFavCount] = useState(0);

  useEffect(() => {
    setFavCount(getTotalItems());
  }, [getTotalItems()]);

  return (
    <nav className="relative w-full h-34 flex justify-center">
      <div className="fixed z-50 w-[80%] mx-auto my-4 px-4 md:px-6 py-3 flex justify-between items-center gap-4 md:gap-10 glass-component border border-white/40">
        <Logo />

        {/* Mobile Menu (includes button and overlay) */}
        <MobileMenu />

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-4 justify-end flex-1">
          <Search />

          <Button asChild variant="ghost" size="icon" className="relative hover:bg-white/20 transition-all rounded-full">
            <Link href="/favorites">
              <HeartIcon className="h-6 w-6" />
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
