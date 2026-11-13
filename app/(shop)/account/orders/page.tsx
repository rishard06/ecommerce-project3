/**
 * Thin account-shell wrapper around the canonical `/orders` list.
 *
 * The list UI, ownership query, and cents formatting live in one place; this
 * route only mounts them inside the account layout. Keep this file free of
 * listing logic so the two routes cannot drift.
 */
export { default, metadata } from "../../orders/page";
