"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/features/identity/server/guards";
import {
  DuplicateReturnError,
  OrderNotFoundError,
  requestReturn,
  ReturnNotEligibleError,
} from "@/features/returns/server/actions";

/**
 * Serializable result for the customer return form. Guard and state failures
 * are returned to the form; unexpected infrastructure errors propagate.
 */
export interface ReturnActionResult {
  success: boolean;
  error?: string;
}

const returnInputSchema = z.object({
  orderId: z.string().min(1, "Order id is required"),
  reason: z
    .string()
    .trim()
    .min(1, "A reason for the return is required.")
    .max(1000, "Return reason must be 1000 characters or fewer."),
  guestToken: z.string().optional(),
});

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function firstError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid input";
  const path = issue.path.length > 0 ? `${issue.path.map(String).join(".")}: ` : "";
  return `${path}${issue.message}`;
}

/**
 * Records a customer return request from form data.
 *
 * The viewer mirrors the order detail page: the signed-in session when
 * present, plus the unguessable guest token carried as a hidden field from
 * `?token=` so guest orders keep access. Anonymous callers without a token
 * get a form error (the page redirects them to login before they can submit).
 * Domain errors map to form errors by class identity — the classes are
 * imported from the same module that throws them.
 */
export async function requestReturnAction(
  formData: FormData,
): Promise<ReturnActionResult> {
  const user = await getCurrentUser();
  const guestToken = text(formData, "guestToken") || null;

  const parsed = returnInputSchema.safeParse({
    orderId: text(formData, "orderId"),
    reason: text(formData, "reason"),
    guestToken: guestToken ?? undefined,
  });

  if (!parsed.success) {
    return { success: false, error: firstError(parsed.error) };
  }

  if (!user && !guestToken) {
    return {
      success: false,
      error: "Sign in or use your order link to request a return.",
    };
  }

  try {
    await requestReturn(
      parsed.data.orderId,
      { userId: user?.id ?? null, guestToken },
      parsed.data.reason,
    );
  } catch (error) {
    if (
      error instanceof OrderNotFoundError ||
      error instanceof ReturnNotEligibleError ||
      error instanceof DuplicateReturnError
    ) {
      return { success: false, error: error.message };
    }
    throw error;
  }

  revalidatePath(`/orders/${parsed.data.orderId}`);
  revalidatePath(`/account/orders/${parsed.data.orderId}`);
  return { success: true };
}
