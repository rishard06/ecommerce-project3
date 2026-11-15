import { prisma } from "@/lib/prisma";
import { assertCents } from "@/lib/money";

/**
 * Coupon validation consumed server-side by the cart quote (Task 10).
 *
 * Codes are normalized to uppercase before lookup. Every rejection throws
 * `CouponError` so callers can map it to a user-facing message; corrupt
 * configuration (neither or both discount legs set) is also a `CouponError`,
 * never a silent discount.
 */

/** Raised when a coupon code is unknown, unusable, or misconfigured. */
export class CouponError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CouponError";
  }
}

export type CouponKind = "PERCENT" | "FIXED";

export interface ValidatedCoupon {
  type: CouponKind;
  /** Whole percent 1-100 for PERCENT; integer cents for FIXED. Never floats. */
  value: number;
  /** Normalized (uppercase) code as stored. */
  code: string;
}

/** Narrow slice of Prisma the validator needs; keeps tests mock-friendly. */
export type CouponClient = Pick<typeof prisma, "coupon">;

/** Uppercase normalization applied on read and write. */
export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Validates a coupon code against the stored Coupon row for a cart subtotal.
 *
 * Rejects unknown codes, expired coupons, exhausted usage caps, and subtotals
 * below `minSubtotalCents`. Returns the discount leg Task 10 prices with.
 */
export async function validateCoupon(
  code: string,
  subtotalCents: number,
  client: CouponClient = prisma,
): Promise<ValidatedCoupon> {
  const normalized = normalizeCouponCode(code);

  if (normalized.length === 0) {
    throw new CouponError("Coupon code is required.");
  }

  assertCents(subtotalCents);

  const coupon = await client.coupon.findUnique({
    where: { code: normalized },
  });

  if (!coupon) {
    throw new CouponError("Coupon code is not valid.");
  }

  if (coupon.expiresAt !== null && coupon.expiresAt <= new Date()) {
    throw new CouponError("Coupon code has expired.");
  }

  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    throw new CouponError("Coupon usage limit has been reached.");
  }

  if (subtotalCents < coupon.minSubtotalCents) {
    throw new CouponError(
      `Coupon requires a minimum subtotal of ${coupon.minSubtotalCents} cents.`,
    );
  }

  const percentSet = coupon.percentOff !== null;
  const fixedSet = coupon.amountOffCents !== null;

  if (percentSet === fixedSet) {
    throw new CouponError("Coupon is misconfigured.");
  }

  const hasPercent =
    percentSet &&
    Number.isInteger(coupon.percentOff) &&
    (coupon.percentOff as number) >= 1 &&
    (coupon.percentOff as number) <= 100;
  const hasFixed =
    fixedSet &&
    Number.isInteger(coupon.amountOffCents) &&
    (coupon.amountOffCents as number) >= 0;

  if (!hasPercent && !hasFixed) {
    throw new CouponError("Coupon is misconfigured.");
  }

  if (hasPercent) {
    return {
      type: "PERCENT",
      value: coupon.percentOff as number,
      code: coupon.code,
    };
  }

  return {
    type: "FIXED",
    value: coupon.amountOffCents as number,
    code: coupon.code,
  };
}

/** Lists every coupon, newest first. Admin-only at the boundary. */
export async function listCoupons(client: CouponClient = prisma) {
  return client.coupon.findMany({ orderBy: { createdAt: "desc" } });
}
