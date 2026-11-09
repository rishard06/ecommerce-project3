/**
 * Integer-cents money primitives.
 *
 * All monetary values in the store are expressed as integer cents (USD).
 * Floating-point dollars are only introduced at the formatting boundary.
 */

export type Currency = "USD";

/**
 * Rejects values that cannot represent a whole number of cents.
 *
 * Cents must be finite, non-negative integers. This guards every price,
 * subtotal, tax amount, and total before it is persisted or sent to Stripe.
 */
export function assertCents(value: number): void {
  if (!Number.isFinite(value)) {
    throw new Error("Cents value must be a finite number");
  }

  if (!Number.isInteger(value)) {
    throw new Error("Cents value must be an integer");
  }

  if (value < 0) {
    throw new Error("Cents value must not be negative");
  }
}

/**
 * Formats integer cents as a localized currency string.
 *
 * Example: `formatCents(1999)` returns `"$19.99"`.
 */
export function formatCents(cents: number, currency: Currency = "USD"): string {
  assertCents(cents);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}
