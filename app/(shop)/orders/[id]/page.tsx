import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  CreditCard,
  MapPin,
  Package,
} from "lucide-react";
import {
  requireUser,
  UnauthorizedError,
} from "@/features/identity/server/guards";
import { getOrderForUser } from "@/features/orders/server/customer-order-service";
import {
  FulfillmentStatusPill,
  OrderStatusPill,
  PaymentStatusPill,
} from "@/features/orders/components/OrderStatusBadges";
import { formatCents } from "@/lib/money";

export const metadata = {
  title: "Order details | venn.",
  description: "View your order items, shipping details, and payment status.",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeStyle: "short",
});

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser().catch((error: unknown) => {
    if (error instanceof UnauthorizedError) {
      return null;
    }
    throw error;
  });

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const order = await getOrderForUser(id, user.id);

  if (!order) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 md:py-12 lg:px-8">
      <nav
        aria-label="Breadcrumb"
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-gray-tertiary"
      >
        <Link
          href="/orders"
          className="rounded transition-colors hover:text-gray-primary"
        >
          Orders
        </Link>
        <ChevronRight
          className="size-4 text-gray-quaternary"
          aria-hidden="true"
        />
        <span aria-current="page" className="text-gray-primary">
          #{order.id.slice(0, 8).toUpperCase()}
        </span>
      </nav>

      <header className="mb-8 flex flex-col justify-between gap-4 md:mb-10 md:flex-row md:items-end">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-primary md:text-4xl">
            Order details
          </h1>
          <p className="font-medium text-gray-tertiary">
            Placed {dateFormatter.format(order.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OrderStatusPill status={order.status} />
          {order.payment ? (
            <PaymentStatusPill status={order.payment.status} />
          ) : null}
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-6 lg:col-span-2">
          <section
            aria-labelledby="order-items-heading"
            className="glass-component p-5 sm:p-6 md:p-7"
          >
            <div className="flex items-center gap-2 text-lg font-semibold tracking-tight text-gray-primary">
              <Package className="size-5 text-gray-tertiary" aria-hidden="true" />
              <h2 id="order-items-heading">Items</h2>
            </div>

            <ul className="mt-5 divide-y divide-gray-primary/10">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/products/${item.productSlug}`}
                      className="text-sm font-semibold text-gray-primary underline-offset-2 transition-colors hover:text-gray-secondary hover:underline"
                    >
                      {item.title}
                    </Link>
                    <p className="mt-1 text-xs font-medium text-gray-tertiary">
                      SKU {item.sku} · Qty {item.quantity} ·{" "}
                      {formatCents(item.unitPriceCents)} each
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-primary">
                    {formatCents(item.lineTotalCents)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section
            aria-labelledby="shipping-heading"
            className="glass-component p-5 sm:p-6 md:p-7"
          >
            <div className="flex items-center gap-2 text-lg font-semibold tracking-tight text-gray-primary">
              <MapPin className="size-5 text-gray-tertiary" aria-hidden="true" />
              <h2 id="shipping-heading">Shipping</h2>
            </div>

            <address className="mt-4 space-y-0.5 text-sm font-medium not-italic leading-relaxed text-gray-secondary">
              <p className="font-semibold text-gray-primary">
                {order.shipping.fullName}
              </p>
              <p>{order.shipping.line1}</p>
              {order.shipping.line2 ? <p>{order.shipping.line2}</p> : null}
              <p>
                {order.shipping.city}, {order.shipping.region}{" "}
                {order.shipping.postalCode}
              </p>
              <p>{order.shipping.country}</p>
            </address>
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24">
          <section
            aria-labelledby="order-status-heading"
            className="glass-component p-5 sm:p-6"
          >
            <h2
              id="order-status-heading"
              className="text-lg font-semibold tracking-tight text-gray-primary"
            >
              Status
            </h2>

            <dl className="mt-4 space-y-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="font-medium text-gray-tertiary">Order</dt>
                <dd>
                  <OrderStatusPill status={order.status} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="font-medium text-gray-tertiary">Payment</dt>
                <dd>
                  {order.payment ? (
                    <PaymentStatusPill status={order.payment.status} />
                  ) : (
                    <span className="text-xs font-semibold text-gray-tertiary">
                      No payment record
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="font-medium text-gray-tertiary">Fulfillment</dt>
                <dd>
                  <FulfillmentStatusPill status={order.fulfillmentStatus} />
                </dd>
              </div>
            </dl>

            {order.payment?.status === "PENDING" ? (
              <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs font-medium leading-relaxed text-amber-700">
                We&apos;re still waiting for Stripe&apos;s signed webhook to
                confirm this payment. No payment state is changed by viewing
                this page.
              </p>
            ) : null}

            {order.payment ? (
              <p className="mt-4 flex items-center gap-2 text-xs font-medium text-gray-quaternary">
                <CreditCard className="size-4" aria-hidden="true" />
                Payment provider:{" "}
                {order.payment.provider === "stripe"
                  ? "Stripe"
                  : order.payment.provider}
              </p>
            ) : null}
          </section>

          <section
            aria-labelledby="totals-heading"
            className="glass-component p-5 sm:p-6"
          >
            <h2
              id="totals-heading"
              className="text-lg font-semibold tracking-tight text-gray-primary"
            >
              Order total
            </h2>

            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="font-medium text-gray-tertiary">Subtotal</dt>
                <dd className="font-semibold tabular-nums text-gray-secondary">
                  {formatCents(order.subtotalCents)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="font-medium text-gray-tertiary">Shipping</dt>
                <dd className="font-semibold tabular-nums text-gray-secondary">
                  {formatCents(order.shippingCents)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="font-medium text-gray-tertiary">Tax</dt>
                <dd className="font-semibold tabular-nums text-gray-secondary">
                  {formatCents(order.taxCents)}
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-gray-primary/10 pt-3 text-base">
                <dt className="font-semibold text-gray-primary">Total</dt>
                <dd className="font-semibold tabular-nums text-gray-primary">
                  {formatCents(order.totalCents)}
                </dd>
              </div>
            </dl>
          </section>

          <Link
            href="/orders"
            className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm font-semibold text-gray-tertiary transition-colors hover:text-gray-primary"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to orders
          </Link>
        </aside>
      </div>
    </div>
  );
}
