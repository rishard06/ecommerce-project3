import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Cart selections are identified by catalog variant id. All money is integer
 * cents (USD); float dollars exist only at the display boundary.
 */
export interface CartItem {
  variantId: string;
  productSlug: string;
  title: string;
  priceCents: number;
  image: string;
  quantity: number;
}

/** Cart input for `addItem`: everything but the quantity. */
export interface CartAddItem {
  variantId: string;
  productSlug: string;
  title: string;
  priceCents: number;
  image: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: CartAddItem) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  /** Integer-cent total — the authoritative stored representation. */
  getTotalPriceCents: () => number;
  /**
   * Transitional float-dollar display helper for the checkout UI, derived
   * from the cent total. Replaced by server-side quotes in a later task.
   */
  getTotalPrice: () => number;
}

/**
 * Persisted-state migration for carts saved by the previous store (v1 and
 * earlier). Legacy carts identified lines by numeric DummyJSON product ids
 * with float prices; those ids can never be reconciled with catalog variant
 * ids, so the old state is explicitly discarded — never coerced into
 * variant ids.
 */
export function migrateCartState(
  persistedState: unknown,
  _version: number,
): Pick<CartStore, 'items'> {
  void persistedState;
  return { items: [] };
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product) => {
        const currentItems = get().items;
        const existingItem = currentItems.find((item) => item.variantId === product.variantId);

        if (existingItem) {
          set({
            items: currentItems.map((item) =>
              item.variantId === product.variantId
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
          });
        } else {
          set({ items: [...currentItems, { ...product, quantity: 1 }] });
        }
      },
      removeItem: (variantId) => {
        set({ items: get().items.filter((item) => item.variantId !== variantId) });
      },
      updateQuantity: (variantId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(variantId);
          return;
        }
        set({
          items: get().items.map((item) =>
            item.variantId === variantId ? { ...item, quantity } : item
          ),
        });
      },
      clearCart: () => set({ items: [] }),
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
      getTotalPriceCents: () => {
        return get().items.reduce(
          (total, item) => total + item.priceCents * item.quantity,
          0
        );
      },
      getTotalPrice: () => get().getTotalPriceCents() / 100,
    }),
    {
      name: 'cart-storage',
      version: 2,
      migrate: migrateCartState,
    }
  )
);
