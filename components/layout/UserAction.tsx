"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { authClient, signOut, useSession } from "../../lib/auth-client";
import { useCartStore } from "@/lib/store/cart-store";
import { useFavoritesStore } from "@/lib/store/favorites-store";

export default function UserAction() {
  const { data: session } = useSession();
  const router = useRouter();
  const clearCart = useCartStore((state) => state.clearCart);
  const clearFavorites = useFavoritesStore((state) => state.clearFavorites);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full border border-white/40 bg-surface-light text-gray-secondary hover:bg-white/60"
          aria-label={session?.user ? "Account menu" : "Sign in"}
        >
          {session?.user ? (
            <img
              src={session.user.image || ""}
              alt=""
              className="size-6 rounded-full object-cover"
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
          <DropdownMenuItem
            onClick={async () => {
              await authClient.revokeSessions();
              await signOut();
              router.push("/");
              clearCart();
              clearFavorites();
            }}
            className="cursor-pointer"
          >
            Log Out
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={() => router.push("/login")}
            className="cursor-pointer"
          >
            Sign In
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
