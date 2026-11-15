"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/features/identity/server/guards";
import { prisma } from "@/lib/prisma";
import { normalizeCouponCode } from "@/features/coupons/server/coupon-service";
import {
  createCouponSchema,
  deleteCouponSchema,
  updateCouponSchema,
} from "@/features/coupons/schemas";

/**
 * Small serializable result for the admin coupon forms. Validation failures
 * return this object instead of throwing: only guard errors (unauthenticated
 * or non-admin callers) may propagate.
 */
export interface CouponActionResult {
  success: boolean;
  error?: string;
  couponId?: string;
}

/** Resolves a form field to a trimmed string; files/non-strings are ignored. */
function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Coerces a numeric form field. Missing or blank fields become `undefined`
 * (optional); anything non-numeric becomes `NaN` so the Zod schemas reject it.
 */
function number(formData: FormData, key: string): number | undefined {
  const value = text(formData, key);
  if (value === "") return undefined;
  return Number(value);
}

/** First validation issue as "field: message", for the inline form errors. */
function firstError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid input";
  const path = issue.path.length > 0 ? `${issue.path.map(String).join(".")}: ` : "";
  return `${path}${issue.message}`;
}

/** Prisma unique-constraint violation (duplicate coupon code). */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002"
  );
}

/** Prisma record-not-found (stale id / already deleted). */
function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2025"
  );
}

/** Generic message for unexpected persistence failures (never masks outages). */
const DATABASE_UNAVAILABLE = "Database unavailable. Please try again.";

/** Raw coupon fields shared by the create and update actions. */
function couponFields(formData: FormData) {
  const expiresAt = text(formData, "expiresAt");
  return {
    code: normalizeCouponCode(text(formData, "code")),
    percentOff: number(formData, "percentOff"),
    amountOffCents: number(formData, "amountOffCents"),
    minSubtotalCents: number(formData, "minSubtotalCents") ?? 0,
    ...(expiresAt ? { expiresAt } : {}),
    ...(number(formData, "maxUses") !== undefined
      ? { maxUses: number(formData, "maxUses") }
      : {}),
  };
}

/** Creates a coupon. Code uniqueness is enforced by the database. */
export async function createCouponAction(
  formData: FormData,
): Promise<CouponActionResult> {
  await requireAdmin();

  const parsed = createCouponSchema.safeParse(couponFields(formData));

  if (!parsed.success) {
    return { success: false, error: firstError(parsed.error) };
  }

  try {
    const coupon = await prisma.coupon.create({
      data: {
        code: parsed.data.code,
        percentOff: parsed.data.percentOff ?? null,
        amountOffCents: parsed.data.amountOffCents ?? null,
        minSubtotalCents: parsed.data.minSubtotalCents,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
        maxUses: parsed.data.maxUses ?? null,
      },
    });

    revalidatePath("/admin/coupons");
    return { success: true, couponId: coupon.id };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { success: false, error: "A coupon with that code already exists." };
    }
    return { success: false, error: DATABASE_UNAVAILABLE };
  }
}

/** Updates a coupon's discount legs, minimum, expiry, and usage cap. */
export async function updateCouponAction(
  formData: FormData,
): Promise<CouponActionResult> {
  await requireAdmin();

  const parsed = updateCouponSchema.safeParse({
    ...couponFields(formData),
    id: text(formData, "id"),
  });

  if (!parsed.success) {
    return { success: false, error: firstError(parsed.error) };
  }

  try {
    await prisma.coupon.update({
      where: { id: parsed.data.id },
      data: {
        code: parsed.data.code,
        percentOff: parsed.data.percentOff ?? null,
        amountOffCents: parsed.data.amountOffCents ?? null,
        minSubtotalCents: parsed.data.minSubtotalCents,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
        maxUses: parsed.data.maxUses ?? null,
      },
    });

    revalidatePath("/admin/coupons");
    return { success: true };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { success: false, error: "That code is already in use." };
    }
    if (isNotFound(error)) {
      return { success: false, error: "Coupon not found." };
    }
    return { success: false, error: DATABASE_UNAVAILABLE };
  }
}

/**
 * Deletes a coupon. Order history is unaffected: orders snapshot the code as
 * a plain `couponCode` string with no foreign key.
 */
export async function deleteCouponAction(
  formData: FormData,
): Promise<CouponActionResult> {
  await requireAdmin();

  const parsed = deleteCouponSchema.safeParse({
    couponId: text(formData, "couponId"),
  });

  if (!parsed.success) {
    return { success: false, error: firstError(parsed.error) };
  }

  try {
    await prisma.coupon.delete({ where: { id: parsed.data.couponId } });
  } catch (error) {
    if (isNotFound(error)) {
      return { success: false, error: "Coupon not found." };
    }
    return { success: false, error: DATABASE_UNAVAILABLE };
  }

  revalidatePath("/admin/coupons");
  return { success: true };
}
