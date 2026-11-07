/**
 * Internal product detail shape consumed by the detail-page views.
 *
 * `id` carries the product slug (the URL identity of the detail page) and
 * `priceCents` is integer cents (USD) — rendered with `formatCents`. The
 * previous float `price`/`originalPrice` fields are gone: the owned catalog
 * stores cents and carries no discount data.
 */
export interface Product {
  id: string;
  name: string;
  /** Category slug, used for catalog links. */
  category: string;
  /** Category display name from the owned catalog. */
  categoryName: string;
  priceCents: number;
  defaultVariantId: string;
  description: string;
  rating: number;
  reviewCount: number;
  images: string[];
  colors?: { name: string; hex: string }[];
  storage?: string[];
  features: string[];
  reviews: Review[];
}

/** Review shape rendered on the detail page. */
export interface Review {
  id: string;
  userName: string;
  rating: number;
  date: string;
  title: string;
  content: string;
}
