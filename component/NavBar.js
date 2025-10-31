import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SearchIcon, HeartIcon, ShoppingBagIcon, UserIcon } from "lucide-react";
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

export default function NavBar({ session }) {
  const router = useRouter();

  const handleSearch = (e) => {
    e.preventDefault();
  };

  return (
    <div className="w-full flex justify-center">
      <div className="fixed z-50 w-[80%] mx-6 my-4 px-6 py-3 flex justify-between gap-10 glass-component">
        <Link href="/">
          <div className="text-4xl font-bold flex items-center">
            <h1 className="text-blue-800 ">v</h1>enn.
          </div>
        </Link>

        <div className="flex items-center space-x-4">
          <form
            onSubmit={handleSearch}
            className="flex-1 max-w-md mx-8 bg-white/30 rounded-full"
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
                  onClick={async () => await signIn.social({ provider: "github", callbackURL: "/" })}
                  className="hover:cursor-pointer p-0"
                >
                  Sign In
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

