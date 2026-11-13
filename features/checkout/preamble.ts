import type { AddressRow } from "@/features/account/types";
import type { CartQuote } from "@/features/cart/types";
import { formatCents } from "@/lib/money";
import type { ShippingInput } from "./types";

/**
 * Demo-compatible shipping form shape. The form keeps first/last name and a
 * single address line; `toShippingInput` is the only boundary that converts it
 * to the production `ShippingInput` snapshot.
 */
export interface ShippingFormState {
  firstName: string;
  lastName: string;
  address: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

export const EMPTY_SHIPPING_FORM: ShippingFormState = {
  firstName: "",
  lastName: "",
  address: "",
  line2: "",
  city: "",
  region: "",
  postalCode: "",
  country: "United States",
};

export const SHIPPING_FORM_FIELDS = [
  "firstName",
  "lastName",
  "address",
  "line2",
  "city",
  "region",
  "postalCode",
  "country",
] as const satisfies ReadonlyArray<keyof ShippingFormState>;

export const REQUIRED_SHIPPING_FIELDS = [
  "firstName",
  "lastName",
  "address",
  "city",
  "region",
  "postalCode",
  "country",
] as const satisfies ReadonlyArray<keyof ShippingFormState>;

/** Session storage slot so browser Back from Stripe restores the same attempt. */
export const SHIPPING_STORAGE_KEY = "checkout-shipping-v1";

/**
 * Converts the visible form into the immutable order shipping snapshot.
 * Blank optional fields are dropped rather than stored as empty strings.
 */
export function toShippingInput(form: ShippingFormState): ShippingInput {
  const line2 = form.line2.trim();

  return {
    fullName: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
    line1: form.address.trim(),
    line2: line2.length > 0 ? line2 : undefined,
    city: form.city.trim(),
    region: form.region.trim(),
    postalCode: form.postalCode.trim(),
    country: form.country.trim(),
  };
}

export function isShippingFormComplete(form: ShippingFormState): boolean {
  return REQUIRED_SHIPPING_FIELDS.every(
    (field) => form[field].trim().length > 0,
  );
}

/**
 * Prefills the form from a saved address. The saved row already stores the
 * production fields, so no shape translation is needed beyond splitting the
 * display name back into the two inputs.
 */
export function shippingFormFromSavedAddress(
  address: AddressRow,
): ShippingFormState {
  const [firstName = "", ...rest] = address.fullName.trim().split(/\s+/);

  return {
    firstName,
    lastName: rest.join(" "),
    address: address.line1,
    line2: address.line2 ?? "",
    city: address.city,
    region: address.region,
    postalCode: address.postalCode,
    country: address.country,
  };
}

export function parseStoredShippingForm(
  raw: string | null,
): ShippingFormState | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    const record = parsed as Record<string, unknown>;
    const form = { ...EMPTY_SHIPPING_FORM };
    let found = false;

    for (const field of SHIPPING_FORM_FIELDS) {
      const value = record[field];
      if (typeof value === "string") {
        form[field] = value;
        found = true;
      }
    }

    return found ? form : null;
  } catch {
    return null;
  }
}

export interface ReviewTotals {
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
}

/**
 * Review totals come only from the server quote. The browser cart is a
 * display estimate and is never used to price the order.
 */
export function getReviewTotals(quote: CartQuote): ReviewTotals {
  return {
    subtotalCents: quote.subtotalCents,
    shippingCents: quote.shippingCents,
    taxCents: quote.taxCents,
    totalCents: quote.totalCents,
  };
}

/** The exact strings the review step renders for a server quote. */
export interface ReviewTotalsDisplay {
  subtotal: string;
  shipping: string;
  tax: string;
  total: string;
}

export function getReviewTotalsDisplay(
  quote: CartQuote,
): ReviewTotalsDisplay {
  const totals = getReviewTotals(quote);

  return {
    subtotal: formatCents(totals.subtotalCents),
    shipping:
      totals.shippingCents === 0
        ? "Free"
        : formatCents(totals.shippingCents),
    tax: formatCents(totals.taxCents),
    total: formatCents(totals.totalCents),
  };
}

export interface CheckoutAttempt {
  readonly idempotencyKey: string;
  /** Returns false when another submit is already in flight. */
  begin(): boolean;
  /** Releases the guard after a failed attempt so the customer can retry. */
  finish(): void;
}

function defaultIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * One checkout attempt holds one idempotency key. Repeated clicks while a
 * submit is pending are ignored, and a failed attempt retries with the same
 * key so the server can return the original pending order.
 */
export function createCheckoutAttempt(
  createKey: () => string = defaultIdempotencyKey,
): CheckoutAttempt {
  const idempotencyKey = createKey();
  let pending = false;

  return {
    idempotencyKey,
    begin() {
      if (pending) {
        return false;
      }

      pending = true;
      return true;
    },
    finish() {
      pending = false;
    },
  };
}
