/**
 * Single source of truth for order math.
 *
 * The cart, checkout form, and checkout summary all render the same total, so
 * the rate lives here instead of being repeated as a magic number in each
 * component (which is how the checkout form previously drifted out of sync).
 */
export const TAX_RATE = 0.015;

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

export function getOrderTotals(subtotal: number): OrderTotals {
  const shipping = 0;
  const tax = subtotal * TAX_RATE;

  return {
    subtotal,
    shipping,
    tax,
    total: subtotal + shipping + tax,
  };
}
