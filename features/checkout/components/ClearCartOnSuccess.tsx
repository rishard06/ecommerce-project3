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
 * order — revisiting the success page never touches the cart again.
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
    const key = `cart-cleared:${orderId}`;
    if (sessionStorage.getItem(key)) return;
    removeItems(variantIds);
    sessionStorage.setItem(key, "1");
  }, [hydrated, removeItems, orderId, variantIds]);

  return null;
}
