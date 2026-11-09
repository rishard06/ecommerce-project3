"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/features/identity/server/guards";
import {
  archiveInputSchema,
  productInputSchema,
  variantInputSchema,
} from "@/features/catalog/schemas";
import {
  archiveProduct,
  ensureDefaultVariant,
  updateVariant,
  upsertProduct,
} from "@/features/catalog/server/catalog-service";

/**
 * Small serializable result for the admin forms. Validation failures return
 * this object instead of throwing: only guard errors (unauthenticated or
 * non-admin callers) may propagate.
 */
export interface AdminActionResult {
  success: boolean;
  error?: string;
  productId?: string;
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

/**
 * Reads newline-separated image URLs. `undefined` (leave images unchanged)
 * only for a blank field; a non-empty field yields the cleaned URL list.
 */
function imageList(formData: FormData, key: string): string[] | undefined {
  const raw = text(formData, key);
  if (raw === "") return undefined;

  const urls = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((url) => url.length > 0);

  return urls.length > 0 ? urls : undefined;
}

/** First validation issue as "field: message", for the inline form errors. */
function firstError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid input";
  const path = issue.path.length > 0 ? `${issue.path.map(String).join(".")}: ` : "";
  return `${path}${issue.message}`;
}

/**
 * Creates or updates a product. Every value comes from the submitted FormData
 * and is validated here after the ADMIN role check; the browser is never
 * trusted. Optional default price/stock fields create the product's default
 * variant (creation flow only).
 */
export async function saveProductAction(
  formData: FormData,
): Promise<AdminActionResult> {
  await requireAdmin();

  // Validate everything before touching the database.
  const rawPriceCents = number(formData, "priceCents");
  const rawOnHand = number(formData, "onHand");
  let defaultStock: { priceCents: number; onHand: number } | undefined;
  if (rawPriceCents !== undefined || rawOnHand !== undefined) {
    const valid =
      rawPriceCents !== undefined &&
      rawOnHand !== undefined &&
      Number.isSafeInteger(rawPriceCents) &&
      rawPriceCents >= 0 &&
      Number.isSafeInteger(rawOnHand) &&
      rawOnHand >= 0;

    if (!valid) {
      return {
        success: false,
        error: "Default price and stock must be whole non-negative numbers (integer cents).",
      };
    }
    defaultStock = { priceCents: rawPriceCents, onHand: rawOnHand };
  }

  const id = text(formData, "id");
  const status = text(formData, "status");
  const images = imageList(formData, "images");

  const parsed = productInputSchema.safeParse({
    ...(id ? { id } : {}),
    slug: text(formData, "slug"),
    title: text(formData, "title"),
    description: text(formData, "description"),
    categoryId: text(formData, "categoryId"),
    ...(status ? { status } : {}),
    ...(images ? { images } : {}),
  });

  if (!parsed.success) {
    return { success: false, error: firstError(parsed.error) };
  }

  const { productId } = await upsertProduct(parsed.data);

  if (defaultStock) {
    await ensureDefaultVariant({ productId, slug: parsed.data.slug, ...defaultStock });
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  return { success: true, productId };
}

/** Updates a variant's price and stock levels (and optionally name/reserved). */
export async function saveVariantAction(
  formData: FormData,
): Promise<AdminActionResult> {
  await requireAdmin();

  const name = text(formData, "name");
  const reserved = number(formData, "reserved");

  const parsed = variantInputSchema.safeParse({
    id: text(formData, "id"),
    ...(name ? { name } : {}),
    priceCents: number(formData, "priceCents"),
    onHand: number(formData, "onHand"),
    ...(reserved !== undefined ? { reserved } : {}),
  });

  if (!parsed.success) {
    return { success: false, error: firstError(parsed.error) };
  }

  await updateVariant(parsed.data);

  // The variant form also carries the owning product id for revalidation;
  // it is never used for authorization or to address the mutation.
  const productId = text(formData, "productId");
  revalidatePath("/admin/products");
  if (productId) revalidatePath(`/admin/products/${productId}`);
  return { success: true };
}

/** Archives a product (soft delete) so order history stays intact. */
export async function archiveProductAction(
  formData: FormData,
): Promise<AdminActionResult> {
  await requireAdmin();

  const parsed = archiveInputSchema.safeParse({
    productId: text(formData, "productId"),
  });

  if (!parsed.success) {
    return { success: false, error: firstError(parsed.error) };
  }

  await archiveProduct(parsed.data.productId);

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${parsed.data.productId}`);
  return { success: true };
}
