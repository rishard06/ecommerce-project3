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
  addItem: (product: FavoriteItem) => void;
  removeItem: (productSlug: string) => void;
  isFavorite: (productSlug: string) => boolean;
  toggleFavorite: (product: FavoriteItem) => void;
  clearFavorites: () => void;
  getTotalItems: () => number;
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

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product) => {
        const currentItems = get().items;
        const exists = currentItems.some((item) => item.productSlug === product.productSlug);
        if (!exists) {
          set({ items: [...currentItems, product] });
        }
      },
      removeItem: (productSlug) => {
        set({ items: get().items.filter((item) => item.productSlug !== productSlug) });
      },
      isFavorite: (productSlug) => {
        return get().items.some((item) => item.productSlug === productSlug);
      },
      toggleFavorite: (product) => {
        const isFav = get().isFavorite(product.productSlug);
        if (isFav) {
          get().removeItem(product.productSlug);
        } else {
          get().addItem(product);
        }
      },
      clearFavorites: () => set({ items: [] }),
      getTotalItems: () => get().items.length,
    }),
    {
      name: 'favorites-storage',
      version: 2,
      migrate: migrateFavoriteState,
    }
  )
);
