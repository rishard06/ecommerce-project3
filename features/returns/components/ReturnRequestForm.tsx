"use client";

import { useActionState } from "react";
import {
  requestReturnAction,
  type ReturnActionResult,
} from "@/features/returns/server/return-actions";

const IDLE: ReturnActionResult = { success: true };

/**
 * Customer return request form for PAID + DELIVERED orders. The guest token
 * arrives as a hidden field from the page's `?token=` so guest orders keep
 * access; the server action re-checks ownership before writing.
 */
export function ReturnRequestForm({
  orderId,
  guestToken,
}: {
  orderId: string;
  guestToken?: string | null;
}) {
  const [state, formAction] = useActionState(
    (_prev: ReturnActionResult, formData: FormData) =>
      requestReturnAction(formData),
    IDLE,
  );

  if (state.success && state !== IDLE) {
    return (
      <p className="text-sm font-medium text-green-700">
        Return request submitted. We&apos;ll review it and update this order.
      </p>
    );
  }

  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="guestToken" value={guestToken ?? ""} />
      <label
        htmlFor={`return-reason-${orderId}`}
        className="text-sm font-medium text-gray-secondary"
      >
        Reason for return
      </label>
      <textarea
        id={`return-reason-${orderId}`}
        name="reason"
        rows={3}
        maxLength={1000}
        placeholder="Tell us why you want to return this order"
        className="w-full rounded-xl border border-gray-primary/15 bg-white/70 px-3 py-2 text-sm text-gray-primary placeholder:text-gray-quaternary"
      />
      <button
        type="submit"
        className="inline-flex w-full items-center justify-center rounded-full border border-gray-primary/15 bg-white/60 px-4 py-2 text-sm font-semibold text-gray-primary transition-colors hover:bg-white/80"
      >
        Request return
      </button>
      {state.success || !state.error ? null : (
        <p role="alert" className="text-sm font-medium text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
