/**
 * Single source of truth for order math.
 *
 * The cart, checkout form, and checkout summary all render the same total, so
 * the rates live here instead of being repeated as a magic number in each
 * component (which is how the checkout form previously drifted out of sync).
 */
export const TAX_RATE = 0.015;

export const SHIPPING_RATES = {
  standard: 4.99,
  express: 12.99,
  pickup: 0,
} as const;

export const COUPONS: Record<string, number> = {
  DEMO10: 0.1,
};

/** Full-price standard orders above this amount ship free. */
export const FREE_STANDARD_SHIPPING_THRESHOLD = 75;

export type ShippingMethod = keyof typeof SHIPPING_RATES;

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  discount?: number;
}

export function getOrderTotals(
  subtotal: number,
  shippingMethod: ShippingMethod = "standard",
  coupon?: string
): OrderTotals {
  const discountRate = coupon ? COUPONS[coupon] ?? 0 : 0;
  const discount = subtotal * discountRate;
  const discountedSubtotal = subtotal - discount;

  let shipping = SHIPPING_RATES[shippingMethod] ?? SHIPPING_RATES.standard;
  // Free standard shipping applies to full-price orders above the threshold.
  // Coupon orders keep the flat standard rate so the demo discount math stays
  // predictable (100 with DEMO10 => 90 + 4.99 + 1.35 = 96.34).
  if (
    !coupon &&
    shippingMethod === "standard" &&
    subtotal > FREE_STANDARD_SHIPPING_THRESHOLD
  ) {
    shipping = 0;
  }

  const tax = discountedSubtotal * TAX_RATE;

  return {
    subtotal,
    shipping,
    tax,
    total: discountedSubtotal + shipping + tax,
    discount,
  };
}
