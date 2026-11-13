import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";
import { listOrdersForUser } from "@/features/orders/server/customer-order-service";
import { OrderStatusPill } from "@/features/orders/components/OrderStatusBadges";
import { requireAccountSession } from "@/features/account/require-session";
import { formatCents } from "@/lib/money";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default async function AccountOrdersPage() {
  const session = await requireAccountSession("/account/orders");
  const orders = await listOrdersForUser(session.user.id);

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-gray-primary">
          Order history
        </h2>
        <p className="text-sm text-gray-tertiary">
          {orders.length} {orders.length === 1 ? "order" : "orders"} placed
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="glass-component p-10 text-center">
          <Package className="mx-auto mb-3 size-8 text-gray-quaternary" aria-hidden="true" />
          <p className="mb-1 font-semibold text-gray-primary">Nothing here yet</p>
          <p className="mb-6 text-sm text-gray-tertiary">
            Place an order and it will show up in this list.
          </p>
          <Link
            href="/products"
            className="inline-flex h-11 items-center justify-center rounded-full bg-gray-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-gray-secondary"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/account/orders/${order.id}`}
                className="glass-component group flex flex-wrap items-center justify-between gap-4 p-5 transition-shadow hover:shadow-lift"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-mono text-xs text-gray-quaternary">
                    #{order.id.slice(0, 8)}
                  </p>
                  <p className="font-semibold text-gray-primary">
                    {dateFormatter.format(order.createdAt)}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-tertiary">
                    <OrderStatusPill status={order.status} />
                    <span>{order.fulfillmentStatus.toLowerCase()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold tabular-nums text-gray-primary">
                    {formatCents(order.totalCents)}
                  </span>
                  <ChevronRight
                    className="size-4 text-gray-quaternary transition-transform duration-200 ease-out-quart group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
