import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ShoppingBag,
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
  title: "Checkout cancelled | venn.",
  description: "Review the status of your cancelled checkout.",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeStyle: "short",
});

export default async function CheckoutCancelPage({
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

  // The cancel redirect never changes payment state. Read whatever the
  // database says — the order may remain PENDING until Stripe's
  // `checkout.session.expired` webhook arrives.
  const paymentConfirmed =
    order.status === "PAID" && order.payment?.status === "SUCCEEDED";
  const orderPending = order.status === "PENDING";

  const heading = paymentConfirmed
    ? "This order is already paid"
    : "Checkout cancelled";

  const description = paymentConfirmed
    ? "Stripe has already confirmed payment for this order, so it was not cancelled. You can review it in your account."
    : orderPending
      ? "No payment was completed and your card was not charged. This order is still marked pending until Stripe confirms the checkout session expired; reserved items are then released automatically."
      : "No payment was completed and your card was not charged. This order has been cancelled and its reserved stock has been released.";

  const Icon = paymentConfirmed ? CheckCircle2 : XCircle;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 md:py-16 lg:px-8">
      <div className="glass-component p-6 sm:p-8 md:p-10">
        <div className="flex flex-col items-center text-center">
          <div
            className={`flex size-16 items-center justify-center rounded-full border shadow-soft ${
              paymentConfirmed
                ? "border-green-600/20 bg-green-500/10"
                : "border-white/60 bg-white/60"
            }`}
          >
            <Icon
              className={`size-8 ${
                paymentConfirmed ? "text-green-600" : "text-gray-tertiary"
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
          <h2 className="text-sm font-semibold text-gray-secondary">
            Current order status
          </h2>

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
              <dt className="font-medium text-gray-tertiary">Order total</dt>
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
            href="/cart"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-gray-tertiary transition-colors hover:text-gray-primary sm:w-auto"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to cart
          </Link>
          <Link
            href="/products"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-accent-500 px-6 text-sm font-semibold text-gray-primary shadow-soft transition-colors hover:bg-accent-600 sm:w-auto"
          >
            <ShoppingBag className="size-4" aria-hidden="true" />
            Continue shopping
          </Link>
        </div>

        <p className="mt-5 text-center text-xs font-medium leading-relaxed text-gray-quaternary">
          You can review{" "}
          <Link
            href={`/orders/${order.id}`}
            className="underline underline-offset-2 transition-colors hover:text-gray-primary"
          >
            this order
          </Link>{" "}
          in your account at any time.
        </p>
      </div>
    </div>
  );
}
