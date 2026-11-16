import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/features/identity/server/guards";
import {
  canRefund,
  getOrderForAdmin,
  visibleFulfillmentTransitions,
} from "@/features/orders/server/admin-order-service";
import {
  AdminFulfillmentStatusBadge,
  AdminOrderStatusBadge,
  AdminPaymentStatusBadge,
} from "@/features/orders/components/AdminStatusBadges";
import {
  auditActionLabel,
  OrderDiscountRow,
} from "@/features/orders/components/OrderDiscount";
import type { FulfillmentStatus } from "@/features/orders/types";
import { formatCents } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ApproveReturnForm,
  FulfillmentActionForm,
  RefundActionForm,
  RejectReturnForm,
} from "./order-action-forms";

export const metadata = { title: "Order · Admin" };

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

const transitionLabels: Record<FulfillmentStatus, string> = {
  UNFULFILLED: "Mark unfulfilled",
  PROCESSING: "Start processing",
  SHIPPED: "Mark shipped",
  DELIVERED: "Mark delivered",
  CANCELLED: "Cancel fulfillment",
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await requireAdmin();

  const order = await getOrderForAdmin(id);

  if (!order) {
    notFound();
  }

  // Cancelled orders are terminal: the service guard rejects every
  // transition, so no buttons are rendered for them.
  const transitions = visibleFulfillmentTransitions(order);

  return (
    <main className="grid gap-8">
      <header className="grid gap-2">
        <Link
          href="/admin/orders"
          className="text-muted-foreground text-sm hover:underline"
        >
          ← Back to orders
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-1">
            <p className="text-accent-foreground text-xs font-semibold tracking-widest uppercase">
              Admin
            </p>
            <h1 className="text-2xl font-semibold tabular-nums">
              Order #{order.id.slice(0, 8).toUpperCase()}
            </h1>
            <p className="text-muted-foreground text-sm">
              Placed {dateFormatter.format(order.createdAt)} ·{" "}
              {order.customerEmail}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AdminOrderStatusBadge status={order.status} />
            {order.payment && (
              <AdminPaymentStatusBadge status={order.payment.status} />
            )}
            <AdminFulfillmentStatusBadge status={order.fulfillmentStatus} />
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b">
                      <th scope="col" className="py-2 pr-4 font-medium">
                        Product
                      </th>
                      <th scope="col" className="py-2 pr-4 font-medium">
                        Unit price
                      </th>
                      <th scope="col" className="py-2 pr-4 font-medium">
                        Qty
                      </th>
                      <th scope="col" className="py-2 font-medium">
                        Line total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id} className="border-b last:border-b-0">
                        <td className="py-3 pr-4">
                          <div className="font-medium">{item.title}</div>
                          <div className="text-muted-foreground">
                            {item.productSlug} · SKU {item.sku}
                          </div>
                        </td>
                        <td className="py-3 pr-4 tabular-nums">
                          {formatCents(item.unitPriceCents)}
                        </td>
                        <td className="py-3 pr-4 tabular-nums">
                          {item.quantity}
                        </td>
                        <td className="py-3 font-medium tabular-nums">
                          {formatCents(item.lineTotalCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer and shipping</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm md:grid-cols-2">
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase">
                  Customer
                </p>
                <p className="mt-1 font-medium">{order.customerEmail}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase">
                  Shipping snapshot
                </p>
                <address className="mt-1 space-y-0.5 not-italic">
                  <p className="font-medium">{order.shipping.fullName}</p>
                  <p>{order.shipping.line1}</p>
                  {order.shipping.line2 && <p>{order.shipping.line2}</p>}
                  <p>
                    {order.shipping.city}, {order.shipping.region}{" "}
                    {order.shipping.postalCode}
                  </p>
                  <p>{order.shipping.country}</p>
                </address>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit history</CardTitle>
            </CardHeader>
            <CardContent>
              {order.auditLogs.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No fulfillment changes have been recorded yet.
                </p>
              ) : (
                <ol className="divide-y">
                  {order.auditLogs.map((entry) => (
                    <li key={entry.id} className="grid gap-1 py-3 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">
                          {auditActionLabel(entry.action)}
                        </span>
                        <span className="text-muted-foreground text-xs tabular-nums">
                          {dateFormatter.format(entry.createdAt)}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {entry.fromStatus ?? "—"} → {entry.toStatus ?? "—"} ·{" "}
                        actor{" "}
                        <span className="font-mono">
                          {entry.actorId ?? "system"}
                        </span>
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Payment</span>
                {order.payment ? (
                  <AdminPaymentStatusBadge status={order.payment.status} />
                ) : (
                  <span className="text-muted-foreground text-xs">
                    No payment record
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Fulfillment</span>
                <AdminFulfillmentStatusBadge
                  status={order.fulfillmentStatus}
                />
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Payment status changes only through signed Stripe webhooks.
                Fulfillment changes below never modify payment or the order
                status.
              </p>
              {order.payment && (
                <p className="text-muted-foreground text-xs">
                  Provider: {order.payment.provider} · charged{" "}
                  <span className="tabular-nums">
                    {formatCents(order.payment.amountCents)}
                  </span>
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fulfillment actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {transitions.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {order.status === "CANCELLED"
                    ? "Cancelled orders are terminal — no further fulfillment changes are possible."
                    : "No further fulfillment transitions are available."}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {transitions.map((next) => (
                    <FulfillmentActionForm
                      key={next}
                      orderId={order.id}
                      next={next}
                      label={transitionLabels[next]}
                    />
                  ))}
                </div>
              )}
              <p className="text-muted-foreground text-xs leading-relaxed">
                Allowed progression is unfulfilled → processing → shipped →
                delivered. Cancellation is only available before shipment.
              </p>
            </CardContent>
          </Card>

          {canRefund(order) && (
            <Card>
              <CardHeader>
                <CardTitle>Refund</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Issues a full Stripe refund and cancels the order. Only
                  available before shipment.
                </p>
                <RefundActionForm orderId={order.id} />
              </CardContent>
            </Card>
          )}

          {order.returnRequest && (
            <Card>
              <CardHeader>
                <CardTitle>Return request</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <p className="text-sm">
                  <span className="font-medium">
                    {order.returnRequest.status === "PENDING"
                      ? "Pending review"
                      : order.returnRequest.status === "APPROVED"
                        ? "Approved — refund issued"
                        : "Rejected — no refund"}
                  </span>
                </p>
                <blockquote className="text-muted-foreground border-l-2 pl-3 text-sm">
                  {order.returnRequest.reason}
                </blockquote>
                <p className="text-muted-foreground text-xs tabular-nums">
                  Requested {dateFormatter.format(order.returnRequest.createdAt)}
                </p>
                {order.returnRequest.status === "PENDING" && (
                  <>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Approving issues a full Stripe refund and cancels the
                      order. Rejecting leaves the order unchanged.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <ApproveReturnForm orderId={order.id} />
                      <RejectReturnForm orderId={order.id} />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Order total</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="tabular-nums">
                    {formatCents(order.subtotalCents)}
                  </dd>
                </div>
                <OrderDiscountRow
                  discountCents={order.discountCents}
                  couponCode={order.couponCode}
                  rowClassName="flex items-center justify-between gap-3"
                  termClassName="text-muted-foreground"
                  valueClassName="tabular-nums"
                />
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Shipping</dt>
                  <dd className="tabular-nums">
                    {formatCents(order.shippingCents)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Tax</dt>
                  <dd className="tabular-nums">{formatCents(order.taxCents)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t pt-2 text-base font-semibold">
                  <dt>Total</dt>
                  <dd className="tabular-nums">
                    {formatCents(order.totalCents)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
