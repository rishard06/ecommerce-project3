/**
 * Shared order view contracts.
 *
 * These mirror the immutable snapshots stored in PostgreSQL. Task 7 and later
 * order services use them as the boundary between the database rows and the
 * customer-facing pages.
 */

export type OrderStatus = "PENDING" | "PAID" | "CANCELLED";

export type PaymentStatus =
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

export type FulfillmentStatus =
  | "UNFULFILLED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export type ReservationStatus = "ACTIVE" | "COMMITTED" | "RELEASED";

/**
 * Raised when a conditional stock reservation cannot be satisfied. The message
 * contains only the variant id (no customer or payment data) so it is safe to
 * surface as a checkout validation error.
 */
export class InsufficientStockError extends Error {
  constructor(variantId: string) {
    super(`Insufficient stock for variant ${variantId}`);
    this.name = "InsufficientStockError";
  }
}

/** Scalar shipping snapshot captured when the order is created. */
export interface ShippingSnapshot {
  fullName: string;
  line1: string;
  line2?: string | null;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

/** Immutable order line snapshot. */
export interface OrderItemSnapshot {
  id: string;
  variantId: string | null;
  productSlug: string;
  sku: string;
  title: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

export interface OrderTotalsSnapshot {
  currency: string;
  subtotalCents: number;
  /** Server-validated coupon discount snapshot (integer cents, 0 when none). */
  discountCents: number;
  /** Normalized (uppercase) coupon code snapshot, null when no coupon applied. */
  couponCode: string | null;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
}

export interface OrderSummary extends OrderTotalsSnapshot {
  id: string;
  createdAt: Date;
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
}

export interface OrderDetail extends OrderSummary {
  items: OrderItemSnapshot[];
  shipping: ShippingSnapshot;
  payment: {
    status: PaymentStatus;
    provider: string;
    amountCents: number;
    currency: string;
  } | null;
}

/** Immutable line data copied from a server-side cart quote. */
export interface CreateOrderItemInput {
  variantId: string;
  productSlug: string;
  sku: string;
  title: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

/** Input accepted by the order-record repository helper. */
export interface CreateOrderRecordInput {
  userId?: string | null;
  guestToken?: string | null;
  idempotencyKey: string;
  currency: string;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  /** Server-validated coupon discount snapshot (integer cents). */
  discountCents?: number;
  /** Normalized (uppercase) coupon code snapshot, if a coupon was applied. */
  couponCode?: string | null;
  /**
   * Guest order-email contact from validated checkout input. The repository
   * persists it only on guest orders with the opt-in flag set — signed-in
   * orders and flag-less addresses stay null (PII minimal).
   */
  guestEmail?: string | null;
  guestEmailOptIn?: boolean;
  shipping: ShippingSnapshot;
  items: CreateOrderItemInput[];
}

export interface CreatePaymentRecordInput {
  orderId: string;
  amountCents: number;
  currency: string;
  provider?: string;
  status?: PaymentStatus;
}

export interface CreateReservationsInput {
  orderId: string;
  expiresAt: Date;
  items: Array<{ variantId: string; quantity: number }>;
}
