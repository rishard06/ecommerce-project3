/**
 * Thin account-shell wrapper around the canonical `/orders/[id]` detail page.
 *
 * Ownership, snapshots, status pills, and the invoice download entry point all
 * stay defined in the canonical route; re-exporting avoids maintaining a
 * second order-detail implementation. The invoice link is absolute
 * (`/orders/[id]/invoice`) and preserves the guest `?token=`, so it works from
 * both the `/orders/[id]` and `/account/orders/[id]` entry points.
 */
// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export { default, metadata } from "../../../orders/[id]/page";
