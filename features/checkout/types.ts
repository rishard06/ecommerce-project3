/** Server-side shipping snapshot accepted by the checkout action/API. */
export interface ShippingInput {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

/** Browser payload for checkout. Identity and prices are never accepted. */
export interface CreateOrderActionInput {
  items: Array<{ variantId: string; quantity: number }>;
  shipping: ShippingInput;
  idempotencyKey: string;
}

export type StartCheckoutActionResult =
  | { success: true; url: string; orderId: string }
  | { success: false; error: string };
