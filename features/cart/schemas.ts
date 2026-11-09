import { z } from "zod";

/**
 * Browser cart submission schema.
 *
 * `z.object` strips unknown keys by default, so a client-supplied `price`,
 * `title`, or `lineTotalCents` never survives validation. Quantities are
 * whole units and capped per line; the server merges duplicate variant ids
 * and re-checks the merged quantity.
 */
export const cartItemInputSchema = z.object({
  variantId: z.string().min(1, "Variant id is required"),
  quantity: z
    .number()
    .int("Quantity must be an integer")
    .min(1, "Quantity must be at least 1")
    .max(10, "Quantity cannot exceed 10 per item"),
});

export const cartItemsSchema = z
  .array(cartItemInputSchema)
  .min(1, "Cart is empty")
  .max(50, "Cart cannot contain more than 50 items");

export type CartItemInputSchema = z.infer<typeof cartItemInputSchema>;
