/**
 * Data-cache tags shared across module boundaries.
 *
 * Storefront product reads (`lib/products.ts`) register their entries under
 * these tags, and admin mutations (`features/catalog/server/admin-actions.ts`)
 * bust them. The constant lives here so the reader and the invalidator can
 * never drift apart — a stale price is a money bug.
 */

/** Every cached product detail/related entry. */
export const PRODUCTS_CACHE_TAG = "products";
