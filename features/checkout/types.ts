export interface ShippingAddress {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

export type PaymentMethod = 'stripe' | 'paypal' | 'crypto';

export type CheckoutStatus = 'idle' | 'validating' | 'processing' | 'success' | 'error';

export interface CheckoutState {
  status: CheckoutStatus;
  error?: string;
  orderId?: string;
}
