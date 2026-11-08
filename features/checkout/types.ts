export interface ShippingAddress {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

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

export type CreateOrderActionResult =
  | { success: true; orderId: string }
  | { success: false; error: string };

export type PaymentMethod = 'stripe' | 'paypal' | 'crypto';

export type CheckoutStatus = 'idle' | 'validating' | 'processing' | 'success' | 'error';

export interface CheckoutState {
  status: CheckoutStatus;
  error?: string;
  orderId?: string;
}
