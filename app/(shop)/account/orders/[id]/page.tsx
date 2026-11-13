/**
 * Thin account-shell wrapper around the canonical `/orders/[id]` detail page.
 *
 * Ownership, snapshots, and status pills stay defined in the canonical route;
 * re-exporting avoids maintaining a second order-detail implementation.
 */
export { default, metadata } from "../../../orders/[id]/page";
