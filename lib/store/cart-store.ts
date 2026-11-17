import { useMemo } from "react";
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
  /**
   * Variant ids checked for checkout. `undefined` means everything is
   * selected — the default for new carts and for carts persisted before
   * selection existed (the key is simply absent there).
   */
  selectedVariantIds?: string[];
  addItem: (product: CartAddItem) => void;
  removeItem: (variantId: string) => void;
  removeItems: (variantIds: string[]) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  toggleSelected: (variantId: string) => void;
  setAllSelected: (selected: boolean) => void;
  isSelected: (variantId: string) => boolean;
  getSelectedItems: () => CartItem[];
  getTotalItems: () => number;
  /** Integer-cent total over the selected lines only. */
  getSelectedPriceCents: () => number;
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
      selectedVariantIds: undefined,
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
          // New lines join the checkout selection; re-adds never uncheck.
          const selected = get().selectedVariantIds;
          set({
            items: [...currentItems, { ...product, quantity: 1 }],
            ...(selected === undefined
              ? {}
              : { selectedVariantIds: [...selected, product.variantId] }),
          });
        }
      },
      removeItem: (variantId) => {
        get().removeItems([variantId]);
      },
      removeItems: (variantIds) => {
        const doomed = new Set(variantIds);
        const selected = get().selectedVariantIds;
        set({
          items: get().items.filter((item) => !doomed.has(item.variantId)),
          ...(selected === undefined
            ? {}
            : {
                selectedVariantIds: selected.filter((id) => !doomed.has(id)),
              }),
        });
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
      clearCart: () => set({ items: [], selectedVariantIds: undefined }),
      toggleSelected: (variantId) => {
        const selected = get().selectedVariantIds;
        if (selected === undefined) {
          // First explicit choice: everything except this line stays checked.
          set({
            selectedVariantIds: get()
              .items.map((item) => item.variantId)
              .filter((id) => id !== variantId),
          });
          return;
        }
        set({
          selectedVariantIds: selected.includes(variantId)
            ? selected.filter((id) => id !== variantId)
            : [...selected, variantId],
        });
      },
      setAllSelected: (selected) => {
        set({ selectedVariantIds: selected ? undefined : [] });
      },
      isSelected: (variantId) => {
        const selected = get().selectedVariantIds;
        return selected === undefined || selected.includes(variantId);
      },
      getSelectedItems: () => {
        const selected = get().selectedVariantIds;
        if (selected === undefined) return get().items;
        const picked = new Set(selected);
        return get().items.filter((item) => picked.has(item.variantId));
      },
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
      getSelectedPriceCents: () => {
        return get()
          .getSelectedItems()
          .reduce(
            (total, item) => total + item.priceCents * item.quantity,
            0,
          );
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

/**
 * The checkout selection as a stable array: the full cart when nothing was
 * explicitly unchecked, otherwise only the checked lines. Memoized so server
 * quote effects that depend on it only refire on real cart/selection edits.
 */
export function useSelectedCartItems(): CartItem[] {
  const items = useCartStore((state) => state.items);
  const selectedVariantIds = useCartStore((state) => state.selectedVariantIds);
  return useMemo(() => {
    if (selectedVariantIds === undefined) return items;
    const picked = new Set(selectedVariantIds);
    return items.filter((item) => picked.has(item.variantId));
  }, [items, selectedVariantIds]);
}
