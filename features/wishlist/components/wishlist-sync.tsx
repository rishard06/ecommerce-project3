"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/lib/auth-client";
import { useFavoritesStore } from "@/lib/store/favorites-store";

/**
 * Pulls the signed-in user's server wishlist into the favorites store right
 * after login so hearts match on every device. Rendered once in the root
 * layout; renders nothing.
 *
 * Keyed on `session.user.id`, not a signed-in boolean: when the account
 * changes without a sign-out (or the session drops), the previous account's
 * hearts are cleared first and then the new list syncs — otherwise the old
 * user's hearts would linger into the new account. Fresh logins (null id to
 * an id) never clear: anonymous local favorites are pushed, not wiped.
 *
 * Accepted tradeoff: clearing also discards local favorites that never
 * synced (e.g. added offline and still unpushed when the account changes).
 * Pushing A's unsynced hearts into B's server list would be worse, so
 * privacy wins over the local cache on this path — the "local cache
 * survives" guarantee holds for fresh logins, not for account switches.
 * Anonymous visitors never fetch (guests stay localStorage-only).
 */
export function WishlistSync() {
  const { data: session } = useSession();
  const syncWithServer = useFavoritesStore((state) => state.syncWithServer);
  const clearFavorites = useFavoritesStore((state) => state.clearFavorites);
  const userId = session?.user?.id ?? null;
  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    if (prevUserId.current !== null && prevUserId.current !== userId) {
      clearFavorites();
    }
    prevUserId.current = userId;

    if (userId) {
      void syncWithServer();
    }
  }, [userId, syncWithServer, clearFavorites]);

  return null;
}
