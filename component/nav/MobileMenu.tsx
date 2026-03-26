"use client";

import React, { useState, useEffect } from "react";
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
import { authClient, signIn, signOut, useSession } from "../../lib/auth-client";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/lib/store/cart-store";
import { CartBadge } from "../CartBadge";
import { CartHoverCard } from "../CartHoverCard";
import CartPreview from "../CartPreview";

export default function MobileMenu() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartPreviewOpen, setIsCartPreviewOpen] = useState(false);
  const { getTotalItems } = useCartStore();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    setCartCount(getTotalItems());
  }, [getTotalItems()]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    setIsCartPreviewOpen(false); // Reset cart preview when menu toggles
  };

  return (
    <>
      <div className="md:hidden flex items-center">
        <Button
          variant="default"
          size="icon"
          className="rounded-full bg-accent-600 hover:bg-accent-700 hover:cursor-pointer z-[60]"
          onClick={toggleMenu}
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </Button>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex gap-4 flex-col w-[80%] md:hidden fixed top-25 glass-component shadow-lg py-6 z-50 border border-white/40 left-1/2 -translate-x-1/2"
          >
            <div className="w-full px-6">
              <div className="relative flex items-center bg-white/30 rounded-full">
                <Input
                  type="search"
                  placeholder="Search products..."
                  className="w-full pl-10 rounded-full border-none bg-transparent"
                />
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-primary" />
              </div>
            </div>

            <div className="flex flex-col items-center gap-6 mt-2">
              <div className="flex justify-between w-full px-8 space-x-4">
                <Button asChild variant="ghost" size="icon" className="bg-white/10 rounded-full border border-white/20">
                  <Link href="/favorites" onClick={() => setIsMenuOpen(false)}>
                    <HeartIcon className="h-6 w-6" />
                  </Link>
                </Button>

                {/* Mobile Cart with "Hover" (Toggle) Preview */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative active:scale-90 transition-transform bg-white/10 rounded-full border border-white/20"
                    onClick={() => setIsCartPreviewOpen(!isCartPreviewOpen)}
                  >
                    <ShoppingBagIcon className="h-6 w-6 text-gray-primary" />
                    <CartBadge count={cartCount} />
                  </Button>
                  
                  <AnimatePresence>
                    {isCartPreviewOpen && (
                      <div className="fixed inset-x-0 bottom-0 top-0 pointer-events-none z-[70] flex items-center justify-center px-4">
                        <motion.div
                           initial={{ opacity: 0, scale: 0.9 }}
                           animate={{ opacity: 1, scale: 1 }}
                           exit={{ opacity: 0, scale: 0.9 }}
                           className="pointer-events-auto w-full max-w-[350px] glass-component shadow-2xl border border-white/60 overflow-hidden rounded-[2.5rem]"
                        >
                           <div className="p-2">
                            <div className="flex justify-end p-2">
                                <button onClick={() => setIsCartPreviewOpen(false)} className="p-2 text-gray-tertiary">
                                    <X className="size-5" />
                                </button>
                            </div>
                             <CartPreview />
                           </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="focus-visible:ring-0 focus-visible:ring-offset-0 hover:cursor-pointer bg-white/10 rounded-full border border-white/20"
                    >
                      {session?.user ? (
                        <img
                          src={session?.user.image || ""}
                          alt="User"
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <UserIcon className="h-6 w-6" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent className="glass-component w-56 px-6 py-2">
                    <DropdownMenuLabel className="p-0">
                      {session?.user ? session.user.name : "My Account"}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {session?.user ? (
                      <DropdownMenuItem
                        onClick={async () => {
                          await authClient.revokeSessions();
                          await signOut();
                          router.refresh();
                          setIsMenuOpen(false);
                        }}
                        className="hover:cursor-pointer p-0"
                      >
                        Log Out
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={async () => {
                          await signIn.social({
                            provider: "github",
                            callbackURL: "/",
                          });
                          setIsMenuOpen(false);
                        }}
                        className="hover:cursor-pointer p-0"
                      >
                        Sign In
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
