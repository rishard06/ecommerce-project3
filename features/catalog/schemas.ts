/**
 * Catalog input schemas shared by the admin server actions.
 *
 * All money is integer cents (USD) and all stock fields are integers:
 * fractional or negative values are rejected. Nothing here is exported to the
 * browser; these schemas only validate server-side inputs that were parsed out
 * of submitted form data.
 */

import { z } from "zod";

/** Mirrors the Prisma `ProductStatus` enum. */
export const CATALOG_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;

export const productInputSchema = z.object({
  /** Present only when editing an existing product. */
  id: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug may contain only lowercase letters, digits, and dashes"),
  title: z.string().min(1),
  description: z.string().min(1),
  categoryId: z.string().min(1),
  /** Omitted on create: the database default applies (DRAFT). */
  status: z.enum(CATALOG_STATUSES).optional(),
  /** Omitted means "leave images unchanged"; an empty array clears them. */
  images: z.array(z.string().min(1)).optional(),
});

export const variantInputSchema = z.object({
  id: z.string().min(1),
  /** Omitted means "leave the variant name unchanged". */
  name: z.string().min(1).optional(),
  priceCents: z.number().int().nonnegative(),
  onHand: z.number().int().nonnegative(),
  /** Omitted means "leave reserved stock unchanged". */
  reserved: z.number().int().nonnegative().optional(),
});

export const archiveInputSchema = z.object({
  productId: z.string().min(1),
});

export type ProductInput = z.infer<typeof productInputSchema>;
export type VariantInput = z.infer<typeof variantInputSchema>;
export type ArchiveInput = z.infer<typeof archiveInputSchema>;

/** Options for `listCatalogProducts`. */
export interface CatalogFilter {
  /** Case-insensitive substring match on the product title. */
  search?: string;
  status?: (typeof CATALOG_STATUSES)[number];
  categoryId?: string;
  /** Page size. Defaults to 50, capped at 100. */
  take?: number;
  /** Offset. Defaults to 0. */
  skip?: number;
}
