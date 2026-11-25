/**
 * Visibility rules for the /products "You may also like" row.
 *
 * Kept free of React and server imports so the rule can be asserted on its own
 * and the page can decide before issuing the featured query.
 */

import type { SearchSort } from "@/features/products/search";

/** Highest-rated products requested for the row above the grid. */
export const FEATURED_ROW_LIMIT = 4;

/** The resolved listing parameters the products page is about to apply. */
export interface FeaturedRowContext {
  category?: string;
  q?: string;
  sort?: SearchSort;
  cursor?: string;
}

/**
 * `true` only for the plain All-products browse view. The page passes the same
 * resolved values it hands to the listing query (trimmed `q`, validated `sort`
 * and `cursor`), so the row cannot disagree with the results it sits above.
 */
export function shouldShowFeaturedRow(context: FeaturedRowContext): boolean {
  return (
    context.category === undefined &&
    context.q === undefined &&
    context.sort === undefined &&
    context.cursor === undefined
  );
}
