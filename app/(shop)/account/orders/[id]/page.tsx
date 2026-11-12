import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getOrderDetail } from "@/features/checkout/actions";
import { requireAccountSession } from "@/features/account/require-session";
import type { ShippingAddress } from "@/features/checkout/types";

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
  const order = await getOrderDetail(session.user.id, id);

  if (!order) {
    notFound();
  }

  const address = order.shippingAddress as unknown as ShippingAddress | null;
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const legacy = order as unknown as Partial<Record<"status" | "subtotal" | "shipping" | "tax" | "coupon", number | string | null>>;
  const displayStatus = typeof legacy.status === "string" ? legacy.status : "PAID";
  const displaySubtotal = typeof legacy.subtotal === "number" ? legacy.subtotal : order.totalAmount;
  const displayShipping = typeof legacy.shipping === "number" ? legacy.shipping : 0;
  const displayTax = typeof legacy.tax === "number" ? legacy.tax : 0;

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
            {displayStatus}
          </span>
        </div>

        <ul className="divide-y divide-gray-primary/10 py-2">
          {order.items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="min-w-0">
                <p className="font-semibold text-gray-primary">{item.title}</p>
                <p className="text-sm text-gray-tertiary">
                  Qty {item.quantity} × ${item.price.toFixed(2)}
                </p>
              </div>
              <p className="font-semibold tabular-nums text-gray-primary">
                ${(item.price * item.quantity).toFixed(2)}
              </p>
            </li>
          ))}
        </ul>

        <div className="space-y-2 border-t border-gray-primary/10 pt-5 text-sm">
          <div className="flex justify-between text-gray-tertiary">
            <span>Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})</span>
            <span className="tabular-nums">${displaySubtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-tertiary">
            <span>Shipping</span>
            <span className="tabular-nums">
              {displayShipping === 0 ? "Free" : `$${displayShipping.toFixed(2)}`}
            </span>
          </div>
          <div className="flex justify-between text-gray-tertiary">
            <span>Tax</span>
            <span className="tabular-nums">${displayTax.toFixed(2)}</span>
          </div>
          {order.coupon ? (
            <div className="flex justify-between text-gray-tertiary">
              <span>Coupon</span>
              <span className="font-semibold uppercase">{order.coupon}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-gray-primary/10 pt-3 text-base font-semibold text-gray-primary">
            <span>Total</span>
            <span className="tabular-nums">${order.totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {address ? (
        <div className="glass-component p-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-tertiary">
            Shipping address
          </h2>
          <address className="not-italic leading-relaxed text-gray-secondary">
            <span className="block font-semibold text-gray-primary">
              {address.firstName} {address.lastName}
            </span>
            <span className="block">{address.address}</span>
            <span className="block">
              {address.city}, {address.postalCode}
            </span>
            <span className="block">{address.country}</span>
          </address>
        </div>
      ) : null}
    </div>
  );
}
