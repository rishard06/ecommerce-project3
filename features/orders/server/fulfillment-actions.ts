"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/features/identity/server/guards";
import { sendFulfillmentEmail } from "@/lib/email/send-fulfillment-email";
import { sendRefundIssuedEmail } from "@/lib/email/send-refund-email";
import {
  sendReturnApprovedEmail,
  sendReturnRejectedEmail,
} from "@/lib/email/send-return-decision-email";
import {
  InvalidFulfillmentTransitionError,
  OrderNotFoundError,
  OrderNotRefundableError,
  ReturnRequestNotFoundError,
  approveReturn,
  refundPayment,
  rejectReturn,
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

const refundInputSchema = z.object({
  orderId: z.string().min(1, "Order id is required"),
});

const returnDecisionInputSchema = z.object({
  orderId: z.string().min(1, "Order id is required"),
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

  // SHIPPED / DELIVERED notify the customer exactly once: the send is only
  // reached when updateFulfillment commits, and the state machine rejects a
  // repeat of the same transition, so a retry throws above before any
  // resend. Best-effort (never throws); all other transitions send nothing.
  if (parsed.data.next === "SHIPPED" || parsed.data.next === "DELIVERED") {
    await sendFulfillmentEmail(parsed.data.orderId, parsed.data.next);
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${parsed.data.orderId}`);
  return { success: true };
}

/**
 * Refunds a paid order in full and cancels it from admin form data.
 *
 * The admin guard runs before parsing or touching Stripe. Only
 * refund/transition state failures are returned to the form; Stripe
 * infrastructure failures still propagate.
 */
export async function refundOrderAction(
  formData: FormData,
): Promise<FulfillmentActionResult> {
  const user = await requireAdmin();

  const parsed = refundInputSchema.safeParse({
    orderId: text(formData, "orderId"),
  });

  if (!parsed.success) {
    return { success: false, error: firstError(parsed.error) };
  }

  let refunded = false;
  try {
    refunded = (await refundPayment(parsed.data.orderId, user.id)).refunded;
  } catch (error) {
    if (
      error instanceof OrderNotRefundableError ||
      error instanceof InvalidFulfillmentTransitionError ||
      error instanceof OrderNotFoundError
    ) {
      return { success: false, error: error.message };
    }
    throw error;
  }

  // Post-commit, best-effort: the refund stands even if the email fails, and
  // an already-cancelled no-op (`refunded: false`) sends nothing.
  if (refunded) {
    await sendRefundIssuedEmail(parsed.data.orderId);
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${parsed.data.orderId}`);
  return { success: true };
}

/**
 * Approves a customer's return request and refunds it in full from admin
 * form data. The decision claims PENDING → APPROVED before any money moves,
 * so a repeat approve is a no-op that never reaches Stripe.
 */
export async function approveReturnAction(
  formData: FormData,
): Promise<FulfillmentActionResult> {
  const user = await requireAdmin();

  const parsed = returnDecisionInputSchema.safeParse({
    orderId: text(formData, "orderId"),
  });

  if (!parsed.success) {
    return { success: false, error: firstError(parsed.error) };
  }

  let approved = false;
  try {
    approved = (await approveReturn(parsed.data.orderId, user.id)).approved;
  } catch (error) {
    if (
      error instanceof ReturnRequestNotFoundError ||
      error instanceof OrderNotRefundableError ||
      error instanceof OrderNotFoundError
    ) {
      return { success: false, error: error.message };
    }
    throw error;
  }

  // Post-commit, best-effort: the decision stands even if the email fails.
  // No-op repeats (`approved: false`) never resend.
  if (approved) {
    await sendReturnApprovedEmail(parsed.data.orderId);
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${parsed.data.orderId}`);
  return { success: true };
}

/**
 * Rejects a customer's return request from admin form data. Money never
 * moves: no Stripe call, no order change. Repeat decisions are no-ops that
 * still return success so the page re-renders the current request status.
 */
export async function rejectReturnAction(
  formData: FormData,
): Promise<FulfillmentActionResult> {
  const user = await requireAdmin();

  const parsed = returnDecisionInputSchema.safeParse({
    orderId: text(formData, "orderId"),
  });

  if (!parsed.success) {
    return { success: false, error: firstError(parsed.error) };
  }

  let rejected = false;
  try {
    rejected = (await rejectReturn(parsed.data.orderId, user.id)).rejected;
  } catch (error) {
    if (error instanceof ReturnRequestNotFoundError) {
      return { success: false, error: error.message };
    }
    throw error;
  }

  // Post-commit, best-effort: the decision stands even if the email fails.
  // No-op repeats (`rejected: false`) never resend.
  if (rejected) {
    await sendReturnRejectedEmail(parsed.data.orderId);
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${parsed.data.orderId}`);
  return { success: true };
}
