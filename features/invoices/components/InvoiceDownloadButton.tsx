import Link from "next/link";
import { Download } from "lucide-react";
import type {
  FulfillmentStatus,
  OrderStatus,
} from "@/features/orders/types";

/**
 * Task 17: invoice entry point visibility.
 *
 * An invoice documents a completed payment, so the button is shown only for
 * `PAID` orders. Physical fulfillment states (processing/shipped/delivered)
 * are still paid orders and keep the button. `PENDING` (payment not confirmed)
 * and `CANCELLED` orders never expose it, and a fulfillment-level cancellation
 * revokes it as well.
 */
export function canDownloadInvoice({
  status,
  fulfillmentStatus,
}: {
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
}): boolean {
  return status === "PAID" && fulfillmentStatus !== "CANCELLED";
}

/**
 * Link to the print-friendly invoice route. Guests keep their opaque token so
 * the invoice page can apply the same `getOrderForViewer` ownership predicate
 * as the order detail page.
 */
export function InvoiceDownloadButton({
  orderId,
  status,
  fulfillmentStatus,
  token,
}: {
  orderId: string;
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  token?: string | null;
}) {
  if (!canDownloadInvoice({ status, fulfillmentStatus })) {
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
