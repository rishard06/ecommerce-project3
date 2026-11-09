import { assertCents } from "./money";

/**
 * Single source of truth for order math.
 *
 * Every monetary value is an integer number of USD cents. The tax rate is a
 * pure calculation input only; stored and returned totals are always rounded
 * to whole cents before they leave this module.
 */
export const TAX_RATE = 0.015;

export interface OrderTotals {
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
}

export function getOrderTotals(subtotalCents: number): OrderTotals {
  assertCents(subtotalCents);

  const shippingCents = 0;
  const taxCents = Math.round(subtotalCents * TAX_RATE);
  const totalCents = subtotalCents + shippingCents + taxCents;

  assertCents(taxCents);
  assertCents(totalCents);

  return {
    subtotalCents,
    shippingCents,
    taxCents,
    totalCents,
  };
}
