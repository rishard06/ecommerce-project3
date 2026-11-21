import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Favorites are identified by product slug and carry the variant the user
 * favorited (for quick add-to-cart). Money is integer cents (USD).
 */
export interface FavoriteItem {
  productSlug: string;
  variantId: string;
  title: string;
  priceCents: number;
  image: string;
  description: string;
}

interface FavoritesStore {
  items: FavoriteItem[];
  /**
   * Cross-device slug list pulled from `/api/wishlist` on login. Kept
   * separate from `items` (and never persisted) because the server stores
   * slugs only — fabricating title/price/image rows for another device's
   * slugs would corrupt the favorites page. Hearts read the union of both.
   */
  serverSlugs: string[];
  addItem: (product: FavoriteItem) => void;
  removeItem: (productSlug: string) => void;
  isFavorite: (productSlug: string) => boolean;
  toggleFavorite: (product: FavoriteItem) => void;
  clearFavorites: () => void;
  getTotalItems: () => number;
  /**
   * Login sync: pulls the server list, pushes local-only slugs (covers
   * favorites made while anonymous/offline), and records the canonical list
   * in `serverSlugs`. Anonymous (401) or offline: keeps the local cache and
   * leaves `serverSlugs` alone (401 resets it) — guests stay local-only.
   */
  syncWithServer: () => Promise<void>;
}

/**
 * Persisted-state migration for favorites saved by the previous store (v1
 * and earlier). Legacy favorites identified products by numeric DummyJSON
 * ids with float prices; those ids can never be reconciled with catalog
 * product slugs, so the old state is explicitly discarded — never coerced.
 */
export function migrateFavoriteState(
  persistedState: unknown,
  _version: number,
): Pick<FavoritesStore, 'items'> {
  void persistedState;
  return { items: [] };
}

/**
 * Best-effort propagation of a local mutation to the server. Fire-and-forget:
 * the local mutation always applies; anonymous callers get 401 (guests stay
 * localStorage-only) and offline failures are swallowed — the next login
 * sync pushes any missing slugs.
 */
async function pushWish(productSlug: string, wished: boolean): Promise<void> {
  try {
    await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: productSlug, wished }),
    });
  } catch {
    // Offline or non-browser env: localStorage stays the cache.
  }
}

async function readWishlist(): Promise<{ status: number; items: string[] }> {
  const res = await fetch("/api/wishlist");
  if (!res.ok) {
    return { status: res.status, items: [] };
  }
  const body = (await res.json()) as { items?: unknown };
  return {
    status: res.status,
    items: Array.isArray(body.items)
      ? body.items.filter((slug): slug is string => typeof slug === "string")
      : [],
  };
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      items: [],
      serverSlugs: [],
      addItem: (product) => {
        const currentItems = get().items;
        const exists = currentItems.some((item) => item.productSlug === product.productSlug);
        if (!exists) {
          set({ items: [...currentItems, product] });
          void pushWish(product.productSlug, true);
        }
      },
      removeItem: (productSlug) => {
        set({ items: get().items.filter((item) => item.productSlug !== productSlug) });
        void pushWish(productSlug, false);
      },
      isFavorite: (productSlug) => {
        return (
          get().items.some((item) => item.productSlug === productSlug) ||
          get().serverSlugs.includes(productSlug)
        );
      },
      toggleFavorite: (product) => {
        const isFav = get().isFavorite(product.productSlug);
        if (isFav) {
          get().removeItem(product.productSlug);
        } else {
          get().addItem(product);
        }
      },
      clearFavorites: () => set({ items: [], serverSlugs: [] }),
      getTotalItems: () =>
        new Set([
          ...get().items.map((item) => item.productSlug),
          ...get().serverSlugs,
        ]).size,
      syncWithServer: async () => {
        let pulled: { status: number; items: string[] };
        try {
          pulled = await readWishlist();
        } catch {
          return;
        }
        if (pulled.status === 401) {
          set({ serverSlugs: [] });
          return;
        }

        let canonical = pulled.items;
        const missing = get()
          .items.map((item) => item.productSlug)
          .filter((slug) => !canonical.includes(slug));
        for (const slug of missing) {
          try {
            const res = await fetch("/api/wishlist", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ slug, wished: true }),
            });
            if (res.status === 401) {
              set({ serverSlugs: [] });
              return;
            }
            if (res.ok) {
              const body = (await res.json()) as { items?: unknown };
              if (Array.isArray(body.items)) {
                canonical = body.items.filter(
                  (entry): entry is string => typeof entry === "string",
                );
              }
            }
          } catch {
            set({ serverSlugs: canonical });
            return;
          }
        }
        set({ serverSlugs: canonical });
      },
    }),
    {
      name: 'favorites-storage',
      version: 2,
      migrate: migrateFavoriteState,
      // serverSlugs is per-session cross-device state: persisting it would
      // leak one user's hearts into the next user's (or a guest's) cache.
      partialize: (state) => ({ items: state.items }),
    }
  )
);
