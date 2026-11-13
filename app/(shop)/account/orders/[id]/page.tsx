import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getOrderForUser } from "@/features/orders/server/customer-order-service";
import { requireAccountSession } from "@/features/account/require-session";
import { formatCents } from "@/lib/money";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeStyle: "short",
});

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAccountSession(`/account/orders/${id}`);
  const order = await getOrderForUser(id, session.user.id);

  if (!order) {
    notFound();
  }

  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const { shipping } = order;

  return (
    <div className="space-y-5">
      <Link
        href="/account/orders"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-tertiary transition-colors hover:text-gray-primary"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to orders
      </Link>

      <div className="glass-component p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-primary/10 pb-5">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-tertiary">
              Order
            </p>
            <p className="break-all font-mono text-sm font-semibold text-gray-primary">
              {order.id}
            </p>
            <p className="text-sm text-gray-tertiary">
              Placed {dateFormatter.format(order.createdAt)}
            </p>
          </div>
          <span className="rounded-full bg-accent-500/60 px-3 py-1 text-xs font-bold uppercase tracking-wide text-gray-primary">
            {order.status}
          </span>
        </div>

        <ul className="divide-y divide-gray-primary/10 py-2">
          {order.items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="min-w-0">
                <p className="font-semibold text-gray-primary">{item.title}</p>
                <p className="text-sm text-gray-tertiary">
                  Qty {item.quantity} × {formatCents(item.unitPriceCents)}
                </p>
              </div>
              <p className="font-semibold tabular-nums text-gray-primary">
                {formatCents(item.lineTotalCents)}
              </p>
            </li>
          ))}
        </ul>

        <div className="space-y-2 border-t border-gray-primary/10 pt-5 text-sm">
          <div className="flex justify-between text-gray-tertiary">
            <span>Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})</span>
            <span className="tabular-nums">{formatCents(order.subtotalCents)}</span>
          </div>
          <div className="flex justify-between text-gray-tertiary">
            <span>Shipping</span>
            <span className="tabular-nums">
              {order.shippingCents === 0 ? "Free" : formatCents(order.shippingCents)}
            </span>
          </div>
          <div className="flex justify-between text-gray-tertiary">
            <span>Tax</span>
            <span className="tabular-nums">{formatCents(order.taxCents)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-primary/10 pt-3 text-base font-semibold text-gray-primary">
            <span>Total</span>
            <span className="tabular-nums">{formatCents(order.totalCents)}</span>
          </div>
        </div>
      </div>

      <div className="glass-component p-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-tertiary">
          Shipping address
        </h2>
        <address className="not-italic leading-relaxed text-gray-secondary">
          <span className="block font-semibold text-gray-primary">
            {shipping.fullName}
          </span>
          <span className="block">{shipping.line1}</span>
          {shipping.line2 ? <span className="block">{shipping.line2}</span> : null}
          <span className="block">
            {shipping.city}, {shipping.region} {shipping.postalCode}
          </span>
          <span className="block">{shipping.country}</span>
        </address>
      </div>
    </div>
  );
}
