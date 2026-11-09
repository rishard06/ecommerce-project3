/**
 * Cart quote contracts shared by the browser and the server.
 *
 * The browser only submits variant ids and quantities. Every price, title,
 * SKU, and total in a quote is produced server-side from the owned catalog.
 */

export interface CartItemInput {
  variantId: string;
  quantity: number;
}

export interface CartQuoteItem {
  variantId: string;
  productSlug: string;
  title: string;
  sku: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

export interface CartQuote {
  items: CartQuoteItem[];
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  currency: "USD";
}
