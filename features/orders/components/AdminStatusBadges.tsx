import { Badge } from "@/components/ui/badge";
import type {
  FulfillmentStatus,
  OrderStatus,
  PaymentStatus,
} from "../types";

/**
 * Restrained admin status badges. Labels describe the database value only;
 * payment and fulfillment are never conflated.
 */

const orderStatusMeta: Record<
  OrderStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PENDING: { label: "Pending payment", variant: "secondary" },
  PAID: { label: "Paid", variant: "default" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

export function AdminOrderStatusBadge({ status }: { status: OrderStatus }) {
  const meta = orderStatusMeta[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

const paymentStatusMeta: Record<
  PaymentStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PENDING: { label: "Awaiting confirmation", variant: "secondary" },
  SUCCEEDED: { label: "Confirmed", variant: "default" },
  FAILED: { label: "Failed", variant: "destructive" },
  CANCELLED: { label: "Cancelled", variant: "outline" },
};

export function AdminPaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const meta = paymentStatusMeta[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

const fulfillmentStatusMeta: Record<
  FulfillmentStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  UNFULFILLED: { label: "Unfulfilled", variant: "outline" },
  PROCESSING: { label: "Processing", variant: "secondary" },
  SHIPPED: { label: "Shipped", variant: "secondary" },
  DELIVERED: { label: "Delivered", variant: "default" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

export function AdminFulfillmentStatusBadge({
  status,
}: {
  status: FulfillmentStatus;
}) {
  const meta = fulfillmentStatusMeta[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}
