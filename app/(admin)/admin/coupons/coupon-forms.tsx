"use client";

import { useActionState } from "react";
import type { Coupon } from "@/app/generated/prisma";
import {
  createCouponAction,
  deleteCouponAction,
  setCouponUsageAction,
  updateCouponAction,
  type CouponActionResult,
} from "@/features/coupons/server/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const IDLE: CouponActionResult = { success: true };

/** Inline server-action failure, so duplicate codes and invalid input are visible. */
function ActionError({ result }: { result: CouponActionResult }) {
  if (result.success || !result.error) return null;

  return (
    <p role="alert" className="text-sm font-medium text-destructive">
      {result.error}
    </p>
  );
}

function toDateInput(value: Date | null): string {
  return value ? value.toISOString().slice(0, 16) : "";
}

/** Create form: validation and duplicate-code failures render inline. */
export function CreateCouponForm() {
  const [state, formAction] = useActionState(
    (_prev: CouponActionResult, formData: FormData) =>
      createCouponAction(formData),
    IDLE,
  );

  return (
    <form action={formAction} className="grid gap-4 md:grid-cols-2">
      <div className="grid gap-1.5">
        <label htmlFor="create-code" className="text-sm font-medium">
          Code
        </label>
        <Input
          id="create-code"
          name="code"
          required
          maxLength={32}
          placeholder="SAVE10"
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="create-min" className="text-sm font-medium">
          Minimum subtotal (cents)
        </label>
        <Input
          id="create-min"
          name="minSubtotalCents"
          type="number"
          min={0}
          step={1}
          placeholder="0"
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="create-percent" className="text-sm font-medium">
          Percent off (1–100)
        </label>
        <Input
          id="create-percent"
          name="percentOff"
          type="number"
          min={1}
          max={100}
          step={1}
          placeholder="10"
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="create-amount" className="text-sm font-medium">
          Fixed amount off (cents)
        </label>
        <Input
          id="create-amount"
          name="amountOffCents"
          type="number"
          min={0}
          step={1}
          placeholder="500"
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="create-expires" className="text-sm font-medium">
          Expires at (optional)
        </label>
        <Input id="create-expires" name="expiresAt" type="datetime-local" />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="create-max" className="text-sm font-medium">
          Max uses (optional)
        </label>
        <Input
          id="create-max"
          name="maxUses"
          type="number"
          min={1}
          step={1}
          placeholder="unlimited"
        />
      </div>

      <div className="md:col-span-2">
        <ActionError result={state} />
      </div>

      <div className="md:col-span-2">
        <Button type="submit">Create coupon</Button>
      </div>
    </form>
  );
}

type EditableCoupon = Pick<
  Coupon,
  | "id"
  | "code"
  | "percentOff"
  | "amountOffCents"
  | "minSubtotalCents"
  | "expiresAt"
  | "maxUses"
  | "usedCount"
>;

/** Row editor for minimum, expiry, and cap; legs ride along unchanged. */
export function UpdateCouponForm({ coupon }: { coupon: EditableCoupon }) {
  const [state, formAction] = useActionState(
    (_prev: CouponActionResult, formData: FormData) =>
      updateCouponAction(formData),
    IDLE,
  );

  return (
    <form action={formAction} className="grid gap-1">
      <div className="flex items-center gap-1">
        <input type="hidden" name="id" value={coupon.id} />
        <input type="hidden" name="code" value={coupon.code} />
        {coupon.percentOff !== null ? (
          <input type="hidden" name="percentOff" value={coupon.percentOff} />
        ) : (
          <input
            type="hidden"
            name="amountOffCents"
            value={coupon.amountOffCents ?? 0}
          />
        )}
        <Input
          name="minSubtotalCents"
          type="number"
          min={0}
          step={1}
          defaultValue={coupon.minSubtotalCents}
          aria-label={`Minimum subtotal for ${coupon.code}`}
          className="w-24"
        />
        <Input
          name="expiresAt"
          type="datetime-local"
          defaultValue={toDateInput(coupon.expiresAt)}
          aria-label={`Expiry for ${coupon.code}`}
          className="w-44"
        />
        <Input
          name="maxUses"
          type="number"
          min={1}
          step={1}
          defaultValue={coupon.maxUses ?? undefined}
          placeholder="∞"
          aria-label={`Max uses for ${coupon.code}`}
          className="w-20"
        />
        <Button type="submit" variant="ghost" size="sm">
          Save
        </Button>
      </div>
      <ActionError result={state} />
    </form>
  );
}

/** Row usage editor: set the exact consumed-use count (0 restores the coupon). */
export function SetCouponUsageForm({ coupon }: { coupon: EditableCoupon }) {
  const [state, formAction] = useActionState(
    (_prev: CouponActionResult, formData: FormData) =>
      setCouponUsageAction(formData),
    IDLE,
  );

  return (
    <form action={formAction} className="grid gap-1">
      <div className="flex items-center gap-1">
        <input type="hidden" name="couponId" value={coupon.id} />
        <Input
          name="usedCount"
          type="number"
          min={0}
          step={1}
          defaultValue={coupon.usedCount}
          aria-label={`Used count for ${coupon.code}`}
          className="w-20"
        />
        <Button type="submit" variant="ghost" size="sm">
          Set
        </Button>
      </div>
      <ActionError result={state} />
    </form>
  );
}

/** One-click reset of the consumed-use count to zero. */
export function ResetCouponUsageForm({ coupon }: { coupon: EditableCoupon }) {
  const [state, formAction] = useActionState(
    (_prev: CouponActionResult, formData: FormData) =>
      setCouponUsageAction(formData),
    IDLE,
  );

  return (
    <form action={formAction} className="grid gap-1">
      <input type="hidden" name="couponId" value={coupon.id} />
      <input type="hidden" name="usedCount" value="0" />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        aria-label={`Reset usage for ${coupon.code}`}
      >
        Reset
      </Button>
      <ActionError result={state} />
    </form>
  );
}

/** Row delete; missing-record and outage failures render inline. */
export function DeleteCouponForm({ couponId }: { couponId: string }) {
  const [state, formAction] = useActionState(
    (_prev: CouponActionResult, formData: FormData) =>
      deleteCouponAction(formData),
    IDLE,
  );

  return (
    <form action={formAction} className="grid gap-1">
      <input type="hidden" name="couponId" value={couponId} />
      <Button type="submit" variant="ghost" size="sm">
        Delete
      </Button>
      <ActionError result={state} />
    </form>
  );
}
