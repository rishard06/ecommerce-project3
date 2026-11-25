"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/lib/store/cart-store";

/**
 * Removes this order's lines from the local cart once Stripe has confirmed
 * payment. Only the purchased variants are removed — unchecked lines the
 * shopper left behind stay in the cart.
 *
 * Rendered only for confirmed payments: while the webhook is still pending
 * the cart is kept, so a failed or abandoned payment can be retried without
 * losing items. The sessionStorage flag makes the removal idempotent per
 * order — revisiting the success page never touches the cart again. A render
 * with no purchased variant ids clears nothing and leaves the flag unset;
 * a render whose lines are already gone only records the flag.
 */
export function ClearCartOnSuccess({
  orderId,
  variantIds,
}: {
  orderId: string;
  variantIds: string[];
}) {
  const removeItems = useCartStore((state) => state.removeItems);
  const [hydrated, setHydrated] = useState(() =>
    useCartStore.persist.hasHydrated(),
  );

  useEffect(() => {
    if (useCartStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useCartStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    // Wait for localStorage rehydration: mutating before the stored cart
    // loads would persist a wrong cart over the real one.
    if (!hydrated) return;
    const purchased = [...new Set(variantIds)];
    // No purchased lines to clear (e.g. every order line lacks a variant):
    // leave the idempotency flag unset so a later render that does carry
    // purchased ids can still clear.
    if (purchased.length === 0) return;
    const key = `cart-cleared:${orderId}`;
    if (sessionStorage.getItem(key)) return;
    const stillPresent = useCartStore
      .getState()
      .items.some((item) => purchased.includes(item.variantId));
    // Lines already gone (cart already empty of them): mark this order done
    // without rewriting the store, so subscribers don't re-render.
    if (!stillPresent) {
      sessionStorage.setItem(key, "1");
      return;
    }
    removeItems(purchased);
    sessionStorage.setItem(key, "1");
  }, [hydrated, removeItems, orderId, variantIds]);

  return null;
}
