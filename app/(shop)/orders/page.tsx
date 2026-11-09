import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Package, ShoppingBag } from "lucide-react";
import {
  requireUser,
  UnauthorizedError,
} from "@/features/identity/server/guards";
import { listOrdersForUser } from "@/features/orders/server/customer-order-service";
import { OrderStatusPill } from "@/features/orders/components/OrderStatusBadges";
import { formatCents } from "@/lib/money";

export const metadata = {
  title: "Your orders | venn.",
  description: "Review your order history and current order status.",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

export default async function OrdersPage() {
  const user = await requireUser().catch((error: unknown) => {
    if (error instanceof UnauthorizedError) {
      return null;
    }
    throw error;
  });

  if (!user) {
    redirect("/login");
  }

  const orders = await listOrdersForUser(user.id);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 md:py-12 lg:px-8">
      <header className="mb-8 space-y-2 md:mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-700">
          Your account
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-primary md:text-4xl">
          Your orders
        </h1>
        <p className="font-medium text-gray-tertiary">
          {orders.length === 0
            ? "Orders you place will appear here."
            : `${orders.length} ${orders.length === 1 ? "order" : "orders"}, newest first.`}
        </p>
      </header>

      {orders.length === 0 ? (
        <div className="glass-component flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="flex size-20 items-center justify-center rounded-full border border-white/50 bg-white/50 shadow-soft">
            <ShoppingBag className="size-9 text-gray-tertiary" aria-hidden="true" />
          </div>
          <h2 className="mt-6 text-2xl font-semibold tracking-tight text-gray-primary">
            No orders yet
          </h2>
          <p className="mt-2 max-w-sm font-medium leading-relaxed text-gray-tertiary">
            When you complete a checkout, your order history and payment status
            will show up here.
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-accent-500 px-7 text-sm font-semibold text-gray-primary shadow-soft transition-colors hover:bg-accent-600"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="group glass-component flex flex-col gap-4 p-5 transition-[box-shadow,transform] duration-200 ease-out-quart hover:-translate-y-0.5 hover:shadow-lift sm:flex-row sm:items-center sm:justify-between sm:p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/50 bg-white/60">
                    <Package
                      className="size-5 text-gray-tertiary"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold tabular-nums text-gray-primary">
                      Order #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-sm font-medium text-gray-tertiary">
                      Placed {dateFormatter.format(order.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pl-[3.75rem] sm:justify-end sm:pl-0">
                  <OrderStatusPill status={order.status} />
                  <span className="text-base font-semibold tabular-nums text-gray-primary">
                    {formatCents(order.totalCents)}
                  </span>
                  <ChevronRight
                    className="size-4 text-gray-quaternary transition-transform duration-200 ease-out-quart group-hover:translate-x-0.5 group-hover:text-gray-primary"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {orders.length > 0 ? (
        <div className="mt-8">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm font-semibold text-gray-tertiary transition-colors hover:text-gray-primary"
          >
            <ShoppingBag className="size-4" aria-hidden="true" />
            Continue shopping
          </Link>
        </div>
      ) : null}
    </div>
  );
}
