import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { getCurrentUser } from "@/features/identity/server/guards";
import { getOrderForViewer } from "@/features/orders/server/customer-order-service";
import { OrderDiscountRow } from "@/features/orders/components/OrderDiscount";
import { canDownloadInvoice } from "@/features/invoices/components/InvoiceDownloadButton";
import { getInvoiceData } from "@/features/invoices/server/render-invoice";
import { formatCents } from "@/lib/money";

/**
 * Print-friendly invoice for one paid order.
 *
 * Ownership uses the exact same `getOrderForViewer` predicate as the order
 * detail page (userId or guest token in `?token=`). All money text comes from
 * Task 16's `getInvoiceData` snapshot; nothing here reads live variant prices
 * or recomputes totals.
 */

export const metadata = {
  title: "Invoice | venn.",
  description: "Print or save a paid order invoice.",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
});

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const user = await getCurrentUser();

  const { id } = await params;
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : null;
  const order = await getOrderForViewer(id, {
    userId: user?.id ?? null,
    guestToken: token,
  });

  if (!order) {
    if (!user && !token) {
      redirect("/login");
    }
    notFound();
  }

  if (
    !canDownloadInvoice({
      status: order.status,
      paymentStatus: order.payment?.status ?? null,
    })
  ) {
    notFound();
  }

  const invoice = await getInvoiceData(order.id);
  if (!invoice) {
    notFound();
  }

  const orderNumber = invoice.orderId.slice(0, 8).toUpperCase();
  const refunded = order.payment?.status === "REFUNDED";
  const backHref = `/orders/${order.id}${
    token ? `?token=${encodeURIComponent(token)}` : ""
  }`;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 md:py-12 lg:px-8 print:max-w-none print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm font-semibold text-gray-tertiary transition-colors hover:text-gray-primary"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to order
        </Link>
        <p className="inline-flex items-center gap-2 text-xs font-medium text-gray-quaternary">
          <Printer className="size-4" aria-hidden="true" />
          Use your browser&apos;s print dialog to save this invoice as a PDF.
        </p>
      </div>

      <article className="rounded-2xl border border-gray-primary/10 bg-white p-6 text-gray-primary shadow-soft sm:p-8 md:p-10 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-col justify-between gap-6 border-b border-gray-primary/10 pb-6 sm:flex-row sm:items-start">
          <div>
            <p className="text-2xl font-semibold tracking-tight">venn.</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
              Invoice
            </h1>
            <p className="mt-2 text-sm font-medium text-gray-tertiary">
              Order #{orderNumber}
            </p>
            {refunded ? (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-green-600/20 bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-700">
                Refunded
              </p>
            ) : null}
          </div>
          <dl className="space-y-1 text-sm sm:text-right">
            <div className="flex justify-between gap-6 sm:justify-end">
              <dt className="font-medium text-gray-tertiary">Order date</dt>
              <dd className="font-semibold tabular-nums">
                {dateFormatter.format(invoice.createdAt)}
              </dd>
            </div>
            <div className="flex justify-between gap-6 sm:justify-end">
              <dt className="font-medium text-gray-tertiary">Currency</dt>
              <dd className="font-semibold">{invoice.currency}</dd>
            </div>
          </dl>
        </header>

        <section
          aria-labelledby="invoice-shipping-heading"
          className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2"
        >
          <div>
            <h2
              id="invoice-shipping-heading"
              className="text-xs font-semibold uppercase tracking-widest text-gray-tertiary"
            >
              Ship to
            </h2>
            <address className="mt-2 space-y-0.5 text-sm font-medium not-italic leading-relaxed text-gray-secondary">
              <p className="font-semibold text-gray-primary">
                {invoice.shipping.fullName}
              </p>
              <p>{invoice.shipping.line1}</p>
              {invoice.shipping.line2 ? (
                <p>{invoice.shipping.line2}</p>
              ) : null}
              <p>
                {invoice.shipping.city}, {invoice.shipping.region}{" "}
                {invoice.shipping.postalCode}
              </p>
              <p>{invoice.shipping.country}</p>
            </address>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-tertiary">
              Order reference
            </h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-gray-secondary">
              Order #{orderNumber}
              {invoice.couponCode ? (
                <>
                  <br />
                  Coupon {invoice.couponCode}
                </>
              ) : null}
            </p>
          </div>
        </section>

        <table className="mt-8 w-full border-collapse text-sm">
          <caption className="sr-only">Invoice line items</caption>
          <thead>
            <tr className="border-b border-gray-primary/10">
              <th
                scope="col"
                className="pb-2 text-left text-xs font-semibold uppercase tracking-widest text-gray-tertiary"
              >
                Item
              </th>
              <th
                scope="col"
                className="pb-2 text-right text-xs font-semibold uppercase tracking-widest text-gray-tertiary"
              >
                Qty
              </th>
              <th
                scope="col"
                className="pb-2 text-right text-xs font-semibold uppercase tracking-widest text-gray-tertiary"
              >
                Unit price
              </th>
              <th
                scope="col"
                className="pb-2 text-right text-xs font-semibold uppercase tracking-widest text-gray-tertiary"
              >
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-primary/10">
            {invoice.lines.map((line) => (
              <tr key={line.id} className="align-top">
                <td className="py-3 pr-3">
                  <p className="font-semibold text-gray-primary">
                    {line.title}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-gray-tertiary">
                    SKU {line.sku}
                  </p>
                </td>
                <td className="py-3 text-right font-medium tabular-nums text-gray-secondary">
                  {line.quantity}
                </td>
                <td className="py-3 text-right font-medium tabular-nums text-gray-secondary">
                  {formatCents(line.unitPriceCents)}
                </td>
                <td className="py-3 text-right font-semibold tabular-nums text-gray-primary">
                  {formatCents(line.lineTotalCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <dl className="w-full max-w-xs space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="font-medium text-gray-tertiary">Subtotal</dt>
              <dd className="font-semibold tabular-nums text-gray-secondary">
                {formatCents(invoice.subtotalCents)}
              </dd>
            </div>
            <OrderDiscountRow
              discountCents={invoice.discountCents}
              couponCode={invoice.couponCode}
              rowClassName="flex items-center justify-between"
              termClassName="font-medium text-gray-tertiary"
              valueClassName="font-semibold tabular-nums text-gray-secondary"
            />
            <div className="flex items-center justify-between">
              <dt className="font-medium text-gray-tertiary">Shipping</dt>
              <dd className="font-semibold tabular-nums text-gray-secondary">
                {formatCents(invoice.shippingCents)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-medium text-gray-tertiary">Tax</dt>
              <dd className="font-semibold tabular-nums text-gray-secondary">
                {formatCents(invoice.taxCents)}
              </dd>
            </div>
            <div className="flex items-center justify-between border-t border-gray-primary/10 pt-3 text-base">
              <dt className="font-semibold text-gray-primary">Total</dt>
              <dd className="font-semibold tabular-nums text-gray-primary">
                {formatCents(invoice.totalCents)}
              </dd>
            </div>
          </dl>
        </div>

        <footer className="mt-8 border-t border-gray-primary/10 pt-4 text-xs font-medium leading-relaxed text-gray-tertiary">
          {refunded
            ? "A full refund was issued for this order. Amounts shown are the snapshots captured when the order was placed and do not change with later price updates."
            : "Thank you for your order. Amounts shown are the snapshots captured when the order was placed and do not change with later price updates."}
        </footer>
      </article>
    </div>
  );
}
