"use client";

import { useActionState } from "react";
import {
  refundOrderAction,
  updateFulfillmentAction,
  type FulfillmentActionResult,
} from "@/features/orders/server/fulfillment-actions";
import type { FulfillmentStatus } from "@/features/orders/types";
import { Button } from "@/components/ui/button";

const IDLE: FulfillmentActionResult = { success: true };

/** Inline server-action failure, so rejected transitions/refunds are visible. */
function ActionError({ result }: { result: FulfillmentActionResult }) {
  if (result.success || !result.error) return null;

  return (
    <p role="alert" className="text-sm font-medium text-destructive">
      {result.error}
    </p>
  );
}

/** One fulfillment transition button; guard rejections render inline. */
export function FulfillmentActionForm({
  orderId,
  next,
  label,
}: {
  orderId: string;
  next: FulfillmentStatus;
  label: string;
}) {
  const [state, formAction] = useActionState(
    (_prev: FulfillmentActionResult, formData: FormData) =>
      updateFulfillmentAction(formData),
    IDLE,
  );

  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="next" value={next} />
      <Button type="submit" variant={next === "CANCELLED" ? "destructive" : "default"}>
        {label}
      </Button>
      <ActionError result={state} />
    </form>
  );
}

/** Full Stripe refund + cancel; the refund guard message renders inline. */
export function RefundActionForm({ orderId }: { orderId: string }) {
  const [state, formAction] = useActionState(
    (_prev: FulfillmentActionResult, formData: FormData) =>
      refundOrderAction(formData),
    IDLE,
  );

  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      <Button type="submit" variant="destructive">
        Refund and cancel order
      </Button>
      <ActionError result={state} />
    </form>
  );
}
