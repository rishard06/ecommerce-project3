/**
 * Thin account-shell wrapper around the canonical `/orders` list.
 *
 * The list UI, ownership query, and cents formatting live in one place; this
 * route only mounts them inside the account layout. Keep this file free of
 * listing logic so the two routes cannot drift.
 */
// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export { default, metadata } from "../../orders/page";
