"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  SearchIcon,
  HeartIcon,
  ShoppingBagIcon,
  UserIcon,
  MenuIcon,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { authClient, signOut, useSession } from "../../lib/auth-client";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useCartStore } from "@/lib/store/cart-store";
import { useFavoritesStore } from "@/lib/store/favorites-store";
import { CartBadge } from "@/features/cart/components/CartBadge";
import CartPreview from "@/features/cart/components/CartPreview";
import { spring } from "@/lib/motion";

export default function MobileMenu() {
  const { data: session } = useSession();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartPreviewOpen, setIsCartPreviewOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const cartItems = useCartStore((state) => state.items);
  const favoriteItems = useFavoritesStore((state) => state.items);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const cartCount = mounted
    ? cartItems.reduce((total, item) => total + item.quantity, 0)
    : 0;
  const favCount = mounted ? favoriteItems.length : 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
    setIsCartPreviewOpen(false);
  }, []);

  // Modal semantics: Escape closes the innermost layer, focus returns to the
  // trigger, and the page underneath does not scroll.
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (isCartPreviewOpen) {
        setIsCartPreviewOpen(false);
      } else {
        closeMenu();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheetRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isMenuOpen, isCartPreviewOpen, closeMenu]);

  const toggleMenu = () => {
    if (isMenuOpen) {
      closeMenu();
    } else {
      setIsMenuOpen(true);
      setIsCartPreviewOpen(false);
    }
  };

  return (
    <>
      <div className="flex items-center md:hidden">
        <Button
          ref={triggerRef}
          variant="default"
          size="icon"
          className="rounded-full bg-accent-500 text-gray-primary hover:bg-accent-600"
          onClick={toggleMenu}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMenuOpen ? (
            <X className="size-5" aria-hidden="true" />
          ) : (
            <MenuIcon className="size-5" aria-hidden="true" />
          )}
        </Button>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Dimming layer. Tapping outside dismisses, like a sheet. */}
            <motion.button
              type="button"
              aria-label="Close menu"
              onClick={() => {
                closeMenu();
                triggerRef.current?.focus();
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-40 bg-gray-primary/25 backdrop-blur-[2px] md:hidden"
            />

            <motion.div
              id="mobile-menu"
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              tabIndex={-1}
              initial={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: -18, scale: 0.97 }
              }
              animate={
                prefersReducedMotion
                  ? { opacity: 1 }
                  : { opacity: 1, y: 0, scale: 1 }
              }
              exit={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: -12, scale: 0.98 }
              }
              transition={spring.sheet}
              className="glass-component fixed inset-x-3 top-[4.75rem] z-50 mx-auto flex max-w-md flex-col gap-5 rounded-[1.75rem] p-5 outline-none md:hidden"
            >
              <form
                role="search"
                aria-label="Product search"
                onSubmit={(event) => {
                  event.preventDefault();
                  const q = searchQuery.trim();
                  router.push(
                    q ? `/products?q=${encodeURIComponent(q)}` : "/products",
                  );
                  closeMenu();
                }}
              >
                <label htmlFor="mobile-search" className="sr-only">
                  Search products
                </label>
                <div className="relative flex items-center">
                  <Input
                    id="mobile-search"
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search products…"
                    className="h-11 w-full rounded-full border-transparent bg-white/50 pl-10 pr-4 text-sm placeholder:text-gray-quaternary focus-visible:bg-white/80"
                  />
                  <SearchIcon
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-tertiary"
                    aria-hidden="true"
                  />
                </div>
              </form>

              <div className="flex items-center justify-between gap-3">
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="rounded-full border border-white/40 bg-white/20 text-gray-primary hover:bg-white/40"
                >
                  <Link
                    href="/favorites"
                    onClick={() => setIsMenuOpen(false)}
                    aria-label={`Favorites, ${favCount} saved`}
                  >
                    <HeartIcon className="size-5" aria-hidden="true" />
                    <CartBadge count={favCount} />
                  </Link>
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="relative rounded-full border border-white/40 bg-white/20 text-gray-primary hover:bg-white/40"
                  onClick={() => setIsCartPreviewOpen(true)}
                  aria-haspopup="dialog"
                  aria-expanded={isCartPreviewOpen}
                  aria-label={`Cart, ${cartCount} items`}
                >
                  <ShoppingBagIcon className="size-5" aria-hidden="true" />
                  <CartBadge count={cartCount} />
                </Button>

                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full border border-white/40 bg-white/20 text-gray-primary hover:bg-white/40"
                      aria-label={session?.user ? "Account menu" : "Sign in"}
                    >
                      {session?.user ? (
                        <img
                          src={session.user.image || ""}
                          alt=""
                          className="size-5 rounded-full object-cover"
                        />
                      ) : (
                        <UserIcon className="size-5" aria-hidden="true" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent className="glass-component w-56 px-4 py-2">
                    <DropdownMenuLabel className="p-0">
                      {session?.user ? session.user.name : "My Account"}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {session?.user ? (
                      <>
                        <DropdownMenuItem
                          onClick={() => {
                            router.push("/account");
                            closeMenu();
                          }}
                          className="cursor-pointer"
                        >
                          Dashboard
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            router.push("/account/orders");
                            closeMenu();
                          }}
                          className="cursor-pointer"
                        >
                          Orders
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            router.push("/account/profile");
                            closeMenu();
                          }}
                          className="cursor-pointer"
                        >
                          Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={async () => {
                            await authClient.revokeSessions();
                            await signOut();
                            router.refresh();
                            closeMenu();
                          }}
                          className="cursor-pointer"
                        >
                          Log Out
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => {
                          router.push("/login");
                          closeMenu();
                        }}
                        className="cursor-pointer"
                      >
                        Sign In
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>

            {/* Cart preview as its own layer, above the menu. */}
            <AnimatePresence>
              {isCartPreviewOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-primary/30 px-4 backdrop-blur-[2px] md:hidden"
                  onClick={() => setIsCartPreviewOpen(false)}
                >
                  <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Cart preview"
                    initial={
                      prefersReducedMotion
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.96, y: 16 }
                    }
                    animate={
                      prefersReducedMotion
                        ? { opacity: 1 }
                        : { opacity: 1, scale: 1, y: 0 }
                    }
                    exit={
                      prefersReducedMotion
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.97, y: 12 }
                    }
                    transition={spring.sheet}
                    onClick={(event) => event.stopPropagation()}
                    className="w-full max-w-[360px] overflow-hidden rounded-[1.75rem] border border-white/50 bg-white/85 shadow-panel backdrop-blur-2xl"
                  >
                    <div className="flex justify-end border-b border-white/30 p-2">
                      <button
                        type="button"
                        onClick={() => setIsCartPreviewOpen(false)}
                        className="rounded-full p-2 text-gray-tertiary transition-colors hover:bg-white/50 hover:text-gray-primary"
                        aria-label="Close cart preview"
                      >
                        <X className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="p-2">
                      <CartPreview />
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
