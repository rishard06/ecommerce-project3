import { z } from "zod";

/**
 * Production shipping address contract shared by the account address book.
 * Keep this in sync with `ShippingInput` in `features/checkout/types.ts`.
 */
export const addressInputSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(160),
  line1: z.string().trim().min(3, "Address line 1 is required").max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1, "City is required").max(120),
  region: z.string().trim().min(1, "Region is required").max(120),
  postalCode: z.string().trim().min(1, "Postal code is required").max(30),
  country: z.string().trim().min(1, "Country is required").max(120),
});

/**
 * Mutation payload: the shipping fields plus the optional default flag. The
 * base `addressInputSchema` remains the public shape; `isDefault` only controls
 * the address book, never the order snapshot.
 */
export const addressMutationSchema = addressInputSchema.extend({
  isDefault: z.boolean().optional(),
});
