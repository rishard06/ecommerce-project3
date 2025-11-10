import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  SearchIcon,
  HeartIcon,
  ShoppingBagIcon,
  UserIcon,
  MenuIcon,
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
import { authClient, signIn, signOut } from "../lib/auth-client";
import { motion } from "framer-motion";

export default function NavBar({ session }) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
  };

  return (
    <div className="relative w-full h-34 flex justify-center">
      <div className="fixed z-50 w-[80%] mx-auto my-4 px-4 md:px-6 py-3 flex justify-between items-center gap-4 md:gap-10 glass-component">
        <Link href="/">
          <div className="text-3xl md:text-4xl font-bold flex items-center">
            <h1 className="text-primary-800 ">v</h1>enn.
          </div>
        </Link>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center">
          <Button
            variant="default"
            size="icon"
            className="rounded-full hover:bg-primary-700 hover:cursor-pointer"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <MenuIcon className="h-6 w-6" />
          </Button>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-4 justify-end">
          <form
            onSubmit={handleSearch}
            className="flex-1 max-w-md bg-white/30 rounded-full"
          >
            <div className="relative flex items-center">
              <Input
                type="search"
                placeholder="Search products..."
                className="w-full pl-10 rounded-full border-none bg-white/30"
                // value={searchQuery}
                // onChange={(e) => setSearchQuery(e.target.value)}
              />
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
          </form>

          <Button asChild variant="ghost" size="icon">
            <Link href="/favorites">
              <HeartIcon className="h-6 w-6" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon">
            <Link href="/cart">
              <ShoppingBagIcon className="h-6 w-6" />
            </Link>
          </Button>

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="focus-visible:ring-0 focus-visible:ring-offset-0 hover:cursor-pointer"
              >
                {session?.user ? (
                  <img
                    src={session?.user.image}
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
                  }}
                  className="hover:cursor-pointer p-0"
                >
                  Log Out
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={async () =>
                    await signIn.social({
                      provider: "github",
                      callbackURL: "/",
                    })
                  }
                  className="hover:cursor-pointer p-0"
                >
                  Sign In
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <motion.div className="flex gap-4 flex-col w-[80%] md:hidden fixed top-25 glass-component shadow-lg py-4 z-50">
          <form onSubmit={handleSearch} className="w-full px-4">
            <div className="relative flex items-center">
              <Input
                type="search"
                placeholder="Search products..."
                className="w-full pl-10 rounded-full border-none bg-white/30"
              />
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
          </form>

          <div className="flex flex-col items-center">
            {/* <Link href="/">
              <span className="text-lg font-semibold" onClick={() => setIsMobileMenuOpen(false)}>Home</span>
            </Link>
            <Link href="/products">
              <span className="text-lg font-semibold" onClick={() => setIsMobileMenuOpen(false)}>All Products</span>
            </Link>
            <Link href="/favorites">
              <span className="text-lg font-semibold" onClick={() => setIsMobileMenuOpen(false)}>Favorites</span>
            </Link>
            <Link href="/cart">
              <span className="text-lg font-semibold" onClick={() => setIsMobileMenuOpen(false)}>Cart</span>
            </Link> */}

            <div className="flex justify-between w-full px-4 space-x-4">
              <Button asChild variant="ghost" size="icon">
                <Link
                  href="/favorites"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <HeartIcon className="h-6 w-6" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="icon">
                <Link href="/cart" onClick={() => setIsMobileMenuOpen(false)}>
                  <ShoppingBagIcon className="h-6 w-6" />
                </Link>
              </Button>
              {/* User Dropdown in Mobile Menu */}
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="focus-visible:ring-0 focus-visible:ring-offset-0 hover:cursor-pointer"
                  >
                    {session?.user ? (
                      <img
                        src={session?.user.image}
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
                        setIsMobileMenuOpen(false);
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
                        setIsMobileMenuOpen(false);
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
    </div>
  );
}
