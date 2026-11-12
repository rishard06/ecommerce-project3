import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: number;
  title: string;
  price: number;
  image: string;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: { id: number; title: string; price: number; image: string }) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product) => {
        const currentItems = get().items;
        const existingItem = currentItems.find((item) => item.id === product.id);

        if (existingItem) {
          set({
            items: currentItems.map((item) =>
              item.id === product.id
                ? { ...item, quantity: Math.min(item.quantity + 1, 99) }
                : item
            ),
          });
        } else {
          set({ items: [...currentItems, { ...product, quantity: 1 }] });
        }
      },
      removeItem: (id) => {
        set({ items: get().items.filter((item) => item.id !== id) });
      },
      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        set({
          items: get().items.map((item) =>
            item.id === id ? { ...item, quantity: Math.min(Math.floor(quantity), 99) } : item
          ),
        });
      },
      clearCart: () => set({ items: [] }),
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
      },
    }),
    {
      name: 'cart-storage',
      version: 1,
      partialize: (state) => ({ items: state.items }),
      migrate: (persistedState) => {
        const state = persistedState as { items?: unknown };
        if (!state || !Array.isArray(state.items)) {
          return { items: [] } as CartStore;
        }
        const items = state.items
          .filter(
            (item): item is CartItem =>
              typeof item === 'object' &&
              item !== null &&
              typeof (item as CartItem).id === 'number' &&
              typeof (item as CartItem).title === 'string' &&
              typeof (item as CartItem).price === 'number' &&
              typeof (item as CartItem).quantity === 'number'
          )
          .map((item) => ({
            ...item,
            quantity: Math.min(Math.max(Math.floor(item.quantity), 1), 99),
          }));
        return { items } as CartStore;
      },
    }
  )
);
