import { formatCents } from "@/lib/money";

/**
 * Shared discount/coupon display primitives for the order surfaces.
 *
 * Both order detail pages (shop + admin) render the coupon snapshot through
 * `OrderDiscountRow` between Subtotal and Shipping, and the admin order list
 * renders it through `AdminOrderCouponCell`. Display-only: no state, no
 * actions.
 */

/** `Discount (CODE)` when a coupon was used, plain `Discount` otherwise. */
export function discountLabel(couponCode: string | null): string {
  return couponCode ? `Discount (${couponCode})` : "Discount";
}

/**
 * One totals-breakdown row for a discounted order. Renders nothing when the
 * snapshot carries no discount, so full-price orders are visually unchanged.
 * The amount is negated as a string because `formatCents` rejects negatives.
 */
export function OrderDiscountRow({
  discountCents,
  couponCode,
  rowClassName,
  termClassName,
  valueClassName,
}: {
  discountCents: number;
  couponCode: string | null;
  rowClassName: string;
  termClassName: string;
  valueClassName: string;
}) {
  if (!(discountCents > 0)) {
    return null;
  }

  return (
    <div className={rowClassName}>
      <dt className={termClassName}>{discountLabel(couponCode)}</dt>
      <dd className={valueClassName}>-{formatCents(discountCents)}</dd>
    </div>
  );
}

/**
 * Compact coupon cell for the admin order list. Shows `CODE (-$X.XX)` when a
 * coupon was used, an em dash otherwise.
 */
export function AdminOrderCouponCell({
  couponCode,
  discountCents,
}: {
  couponCode: string | null;
  discountCents: number;
}) {
  if (!couponCode) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  return (
    <span>
      <span className="font-medium">{couponCode}</span>{" "}
      <span className="text-muted-foreground tabular-nums">
        (-{formatCents(discountCents)})
      </span>
    </span>
  );
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  FULFILLMENT_UPDATED: "Fulfillment updated",
  ORDER_CANCELLED: "Order cancelled",
  ORDER_REFUNDED: "Refund issued",
};

/** Human label for an `OrderAuditLog.action`; unknown tokens pass through. */
export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}
