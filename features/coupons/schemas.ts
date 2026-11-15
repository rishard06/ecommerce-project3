import { z } from "zod";

/** Uppercase coupon codes: short, human-typable, no spaces. */
const codeSchema = z
  .string()
  .trim()
  .min(1, "Code is required")
  .max(32, "Code must be at most 32 characters")
  .regex(/^[A-Za-z0-9-]+$/, "Code may only contain letters, numbers, and dashes")
  .transform((code) => code.toUpperCase());

const percentSchema = z
  .number()
  .int("Percent must be a whole number")
  .min(1, "Percent must be at least 1")
  .max(100, "Percent must be at most 100");

const amountSchema = z
  .number()
  .int("Fixed amount must be whole cents")
  .min(0, "Fixed amount must not be negative");

const baseCouponSchema = z.object({
  code: codeSchema,
  percentOff: percentSchema.optional(),
  amountOffCents: amountSchema.optional(),
  minSubtotalCents: z
    .number()
    .int("Minimum subtotal must be whole cents")
    .min(0, "Minimum subtotal must not be negative")
    .default(0),
  expiresAt: z
    .string()
    .trim()
    .min(1, "Invalid date")
    // Accepts full ISO strings and `datetime-local` values ("2026-01-01T19:30").
    .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date")
    .optional(),
  maxUses: z
    .number()
    .int("Max uses must be a whole number")
    .min(1, "Max uses must be at least 1")
    .optional(),
});

/**
 * Exactly one discount leg: a coupon is either PERCENT or FIXED.
 * `minSubtotalCents`/`maxUses` stay integer cents/counts end-to-end.
 */
const legRefinement = {
  message: "Set exactly one of percentOff or amountOffCents",
  path: ["percentOff"],
};

function hasExactlyOneLeg(data: {
  percentOff?: number;
  amountOffCents?: number;
}): boolean {
  return (data.percentOff !== undefined) !== (data.amountOffCents !== undefined);
}

export const createCouponSchema = baseCouponSchema.refine(hasExactlyOneLeg, legRefinement);

export const updateCouponSchema = baseCouponSchema
  .extend({ id: z.string().min(1, "Coupon id is required") })
  .refine(hasExactlyOneLeg, legRefinement);

export const deleteCouponSchema = z.object({
  couponId: z.string().min(1, "Coupon id is required"),
});

/**
 * Operator correction lever for `usedCount`. Sets the exact consumed-use
 * count; resetting to 0 restores a fully burned coupon. Integer counts
 * end-to-end, never negative.
 */
export const setCouponUsageSchema = z.object({
  couponId: z.string().min(1, "Coupon id is required"),
  usedCount: z
    .number()
    .int("Usage must be a whole number")
    .min(0, "Usage must not be negative"),
});

export type SetCouponUsageInput = z.infer<typeof setCouponUsageSchema>;

export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
