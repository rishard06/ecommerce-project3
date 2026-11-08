import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  ReceiptText,
  XCircle,
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
  title: "Payment status | venn.",
  description: "Check your order payment status. Payment is confirmed only by Stripe.",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeStyle: "short",
});

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string | string[] }>;
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

  const params = await searchParams;
  const orderId = typeof params.orderId === "string" ? params.orderId : null;

  if (!orderId) {
    notFound();
  }

  const order = await getOrderForUser(orderId, user.id);

  if (!order) {
    notFound();
  }

  // Stripe webhooks are the only payment truth. A success redirect and the
  // query string can never make an order paid.
  const paymentConfirmed =
    order.status === "PAID" && order.payment?.status === "SUCCEEDED";
  const orderCancelled = order.status === "CANCELLED";
  const awaitingConfirmation = !paymentConfirmed && !orderCancelled;

  const heading = paymentConfirmed
    ? "Payment confirmed"
    : orderCancelled
      ? "Payment was not completed"
      : "Payment is processing";

  const description = paymentConfirmed
    ? "Stripe has confirmed your payment and your order is paid. We'll keep the fulfillment status below up to date."
    : orderCancelled
      ? "This order is cancelled, so no payment is due. If you believe a payment was taken, contact support with the order number below."
      : "We're waiting for Stripe's signed webhook to confirm your payment. This can take a moment — there is no need to pay again. The status shown here always comes from our database, not from the link you followed.";

  const Icon = paymentConfirmed
    ? CheckCircle2
    : orderCancelled
      ? XCircle
      : Clock3;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 md:py-16 lg:px-8">
      <div className="glass-component p-6 sm:p-8 md:p-10">
        <div className="flex flex-col items-center text-center">
          <div
            className={`flex size-16 items-center justify-center rounded-full border shadow-soft ${
              paymentConfirmed
                ? "border-green-600/20 bg-green-500/10"
                : orderCancelled
                  ? "border-red-500/20 bg-red-500/10"
                  : "border-amber-500/25 bg-amber-500/10"
            }`}
          >
            <Icon
              className={`size-8 ${
                paymentConfirmed
                  ? "text-green-600"
                  : orderCancelled
                    ? "text-red-500"
                    : "text-amber-600"
              }`}
              aria-hidden="true"
            />
          </div>

          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-gray-primary md:text-4xl">
            {heading}
          </h1>
          <p className="mt-3 max-w-xl text-sm font-medium leading-relaxed text-gray-tertiary md:text-base">
            {description}
          </p>
        </div>

        <div className="mt-9 rounded-2xl border border-white/50 bg-white/40 p-5 sm:p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-secondary">
            <ReceiptText className="size-4" aria-hidden="true" />
            <h2>Order summary</h2>
          </div>

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-gray-tertiary">Order</dt>
              <dd className="mt-1 font-semibold tabular-nums text-gray-primary">
                #{order.id.slice(0, 8).toUpperCase()}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-tertiary">Placed</dt>
              <dd className="mt-1 font-semibold text-gray-primary">
                {dateFormatter.format(order.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-tertiary">Total</dt>
              <dd className="mt-1 font-semibold tabular-nums text-gray-primary">
                {formatCents(order.totalCents)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-tertiary">Payment</dt>
              <dd className="mt-1">
                {order.payment ? (
                  <PaymentStatusPill status={order.payment.status} />
                ) : (
                  <span className="text-sm font-medium text-gray-tertiary">
                    No payment record
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-tertiary">Order status</dt>
              <dd className="mt-1">
                <OrderStatusPill status={order.status} />
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-tertiary">Fulfillment</dt>
              <dd className="mt-1">
                <FulfillmentStatusPill status={order.fulfillmentStatus} />
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-7 flex flex-col-reverse items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/products"
            className="inline-flex h-11 w-full items-center justify-center rounded-full px-6 text-sm font-semibold text-gray-tertiary transition-colors hover:text-gray-primary sm:w-auto"
          >
            Continue shopping
          </Link>
          <Link
            href={`/orders/${order.id}`}
            className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-accent-500 px-6 text-sm font-semibold text-gray-primary shadow-soft transition-colors hover:bg-accent-600 sm:w-auto"
          >
            View order details
            <ArrowRight
              className="size-4 transition-transform duration-200 ease-out-quart group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>

        {awaitingConfirmation ? (
          <p className="mt-5 text-center text-xs font-medium leading-relaxed text-gray-quaternary">
            You can safely{" "}
            <Link
              href={`/checkout/success?orderId=${encodeURIComponent(order.id)}`}
              className="underline underline-offset-2 transition-colors hover:text-gray-primary"
            >
              check this page again
            </Link>{" "}
            or review the order in your account. Refreshing never changes the
            payment status.
          </p>
        ) : null}
      </div>
    </div>
  );
}
