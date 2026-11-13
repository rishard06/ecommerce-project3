import type { ReactNode } from "react";
import type {
  FulfillmentStatus,
  OrderStatus,
  PaymentStatus,
} from "../types";

/**
 * Compact glass-friendly status pills shared by the payment return pages and
 * the customer order pages. Labels always describe the database status only.
 */

type Tone = "success" | "warning" | "danger" | "neutral" | "info";

const toneStyles: Record<Tone, { pill: string; dot: string }> = {
  success: {
    pill: "border-green-600/20 bg-green-500/10 text-green-700",
    dot: "bg-green-600",
  },
  warning: {
    pill: "border-amber-500/25 bg-amber-500/10 text-amber-700",
    dot: "bg-amber-500",
  },
  danger: {
    pill: "border-red-500/20 bg-red-500/10 text-red-700",
    dot: "bg-red-500",
  },
  neutral: {
    pill: "border-white/60 bg-white/50 text-gray-secondary",
    dot: "bg-gray-quaternary",
  },
  info: {
    pill: "border-primary-600/20 bg-primary-50 text-primary-700",
    dot: "bg-primary-600",
  },
};

export function StatusPill({
  tone,
  children,
}: {
  tone: Tone;
  children: ReactNode;
}) {
  const styles = toneStyles[tone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${styles.pill}`}
    >
      <span
        className={`size-1.5 rounded-full ${styles.dot}`}
        aria-hidden="true"
      />
      {children}
    </span>
  );
}

const orderStatusMeta: Record<OrderStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Pending payment", tone: "warning" },
  PAID: { label: "Paid", tone: "success" },
  SHIPPED: { label: "Shipped", tone: "info" },
  CANCELLED: { label: "Cancelled", tone: "danger" },
};

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  const meta = orderStatusMeta[status];
  return <StatusPill tone={meta.tone}>{meta.label}</StatusPill>;
}

const paymentStatusMeta: Record<PaymentStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Awaiting confirmation", tone: "warning" },
  SUCCEEDED: { label: "Confirmed", tone: "success" },
  FAILED: { label: "Failed", tone: "danger" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

export function PaymentStatusPill({ status }: { status: PaymentStatus }) {
  const meta = paymentStatusMeta[status];
  return <StatusPill tone={meta.tone}>{meta.label}</StatusPill>;
}

const fulfillmentStatusMeta: Record<
  FulfillmentStatus,
  { label: string; tone: Tone }
> = {
  UNFULFILLED: { label: "Unfulfilled", tone: "neutral" },
  PROCESSING: { label: "Processing", tone: "info" },
  SHIPPED: { label: "Shipped", tone: "info" },
  DELIVERED: { label: "Delivered", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "danger" },
};

export function FulfillmentStatusPill({
  status,
}: {
  status: FulfillmentStatus;
}) {
  const meta = fulfillmentStatusMeta[status];
  return <StatusPill tone={meta.tone}>{meta.label}</StatusPill>;
}
