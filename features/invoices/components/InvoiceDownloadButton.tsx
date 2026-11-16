import Link from "next/link";
import { Download } from "lucide-react";
import type {
  OrderStatus,
  PaymentStatus,
} from "@/features/orders/types";

/**
 * Task 17 invoice entry point visibility, revised by retro Batch 3 I2.
 *
 * Entitlement follows payment history, not the current order status: an
 * invoice documents a completed payment, so the button is shown whenever the
 * payment reached `SUCCEEDED` or `REFUNDED`. Every in-app refund flips the
 * order (and its fulfillment) to `CANCELLED`, and a pre-shipment fulfillment
 * cancel does the same — neither erases the financial record, so neither
 * revokes the invoice. `PENDING` orders stay hidden even if a payment row
 * exists (payment not confirmed), as do `PENDING`/`CANCELLED`/`FAILED`
 * payments and orders with no payment record at all.
 */
export function canDownloadInvoice({
  status,
  paymentStatus,
}: {
  status: OrderStatus;
  paymentStatus: PaymentStatus | null;
}): boolean {
  if (status === "PENDING") {
    return false;
  }
  return paymentStatus === "SUCCEEDED" || paymentStatus === "REFUNDED";
}

/**
 * Link to the print-friendly invoice route. Guests keep their opaque token so
 * the invoice page can apply the same `getOrderForViewer` ownership predicate
 * as the order detail page.
 */
export function InvoiceDownloadButton({
  orderId,
  status,
  paymentStatus,
  token,
}: {
  orderId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus | null;
  token?: string | null;
}) {
  if (!canDownloadInvoice({ status, paymentStatus })) {
    return null;
  }

  const href = `/orders/${orderId}/invoice${
    token ? `?token=${encodeURIComponent(token)}` : ""
  }`;

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-gray-primary/15 bg-white/60 px-4 py-2 text-sm font-semibold text-gray-primary transition-colors hover:bg-white/80 print:hidden"
    >
      <Download className="size-4 text-gray-tertiary" aria-hidden="true" />
      Download invoice
    </Link>
  );
}
