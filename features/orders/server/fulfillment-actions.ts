"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/features/identity/server/guards";
import {
  InvalidFulfillmentTransitionError,
  OrderNotFoundError,
  updateFulfillment,
} from "@/features/orders/server/admin-order-service";

/**
 * Serializable result for the admin fulfillment forms. Guard failures
 * (anonymous or non-admin callers) still propagate; only input and state
 * machine errors are returned to the form.
 */
export interface FulfillmentActionResult {
  success: boolean;
  error?: string;
}

const fulfillmentInputSchema = z.object({
  orderId: z.string().min(1, "Order id is required"),
  next: z.enum(
    ["UNFULFILLED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"],
    { message: "Unknown fulfillment status" },
  ),
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
 * Applies an admin fulfillment transition from form data.
 *
 * The admin guard runs before parsing or touching the database. Browser input
 * is limited to the order id and target status; the actor id always comes from
 * the verified session.
 */
export async function updateFulfillmentAction(
  formData: FormData,
): Promise<FulfillmentActionResult> {
  const user = await requireAdmin();

  const parsed = fulfillmentInputSchema.safeParse({
    orderId: text(formData, "orderId"),
    next: text(formData, "next"),
  });

  if (!parsed.success) {
    return { success: false, error: firstError(parsed.error) };
  }

  try {
    await updateFulfillment(parsed.data.orderId, parsed.data.next, user.id);
  } catch (error) {
    if (
      error instanceof InvalidFulfillmentTransitionError ||
      error instanceof OrderNotFoundError
    ) {
      return { success: false, error: error.message };
    }
    throw error;
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${parsed.data.orderId}`);
  return { success: true };
}
