"use client";

import { useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useFavoritesStore } from "@/lib/store/favorites-store";

/**
 * Pulls the signed-in user's server wishlist into the favorites store right
 * after login so hearts match on every device. Rendered once in the root
 * layout; renders nothing. Logout resets via `clearFavorites`, and anonymous
 * visitors never fetch (guests stay localStorage-only).
 */
export function WishlistSync() {
  const { data: session } = useSession();
  const syncWithServer = useFavoritesStore((state) => state.syncWithServer);
  const signedIn = Boolean(session?.user);

  useEffect(() => {
    if (signedIn) {
      void syncWithServer();
    }
  }, [signedIn, syncWithServer]);

  return null;
}
