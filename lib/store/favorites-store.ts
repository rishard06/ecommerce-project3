import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FavoriteItem {
  id: number;
  title: string;
  price: number;
  image: string;
  description: string;
}

interface FavoritesStore {
  items: FavoriteItem[];
  addItem: (product: FavoriteItem) => void;
  removeItem: (id: number) => void;
  isFavorite: (id: number) => boolean;
  toggleFavorite: (product: FavoriteItem) => void;
  clearFavorites: () => void;
  getTotalItems: () => number;
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product) => {
        const currentItems = get().items;
        const exists = currentItems.some((item) => item.id === product.id);
        if (!exists) {
          set({ items: [...currentItems, product] });
        }
      },
      removeItem: (id) => {
        set({ items: get().items.filter((item) => item.id !== id) });
      },
      isFavorite: (id) => {
        return get().items.some((item) => item.id === id);
      },
      toggleFavorite: (product) => {
        const isFav = get().isFavorite(product.id);
        if (isFav) {
          get().removeItem(product.id);
        } else {
          get().addItem(product);
        }
      },
      clearFavorites: () => set({ items: [] }),
      getTotalItems: () => get().items.length,
    }),
    {
      name: 'favorites-storage',
    }
  )
);
