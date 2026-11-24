import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, MapPin, Package, ShoppingBag } from "lucide-react";
import { listOrdersForUser } from "@/features/orders/server/customer-order-service";
import {
  FulfillmentStatusPill,
  OrderStatusPill,
} from "@/features/orders/components/OrderStatusBadges";
import { listAddresses } from "@/features/account/address-actions";
import { requireAccountSession } from "@/features/account/require-session";
import { formatCents } from "@/lib/money";
import { Skeleton } from "@/components/ui/skeleton";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default function AccountPage() {
  return (
    <div className="space-y-6">
      {/*
       * The shortcut cards below are static: they paint immediately with the
       * shell while the session-gated dashboard streams in behind its own
       * boundary instead of holding the whole page hostage.
       */}
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/account/profile"
          className="glass-component p-5 transition-shadow hover:shadow-lift"
        >
          <p className="font-semibold text-gray-primary">Edit profile</p>
          <p className="mt-1 text-sm text-gray-tertiary">
            Update your display name and avatar.
          </p>
        </Link>
        <Link
          href="/account/settings"
          className="glass-component p-5 transition-shadow hover:shadow-lift"
        >
          <p className="font-semibold text-gray-primary">Account settings</p>
          <p className="mt-1 text-sm text-gray-tertiary">
            Manage your session and security.
          </p>
        </Link>
      </section>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <section className="grid gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="glass-component flex items-center gap-4 p-5">
            <Skeleton className="size-12 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-7 w-12 rounded-md" />
              <Skeleton className="h-4 w-28 rounded-full" />
            </div>
          </div>
        ))}
      </section>
      <section className="glass-component space-y-4 p-6">
        <Skeleton className="h-6 w-32 rounded-md" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <Skeleton className="h-4 w-36 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-md" />
          </div>
        ))}
      </section>
      <span className="sr-only">Loading dashboard…</span>
    </div>
  );
}

async function DashboardContent() {
  // Session and dashboard queries resolve inside the boundary: the memoized
  // per-request session costs no extra lookup, and the static cards above
  // never wait for either.
  const session = await requireAccountSession();
  const userId = session.user.id;
  let orders: Awaited<ReturnType<typeof listOrdersForUser>> = [];
  let addresses: Awaited<ReturnType<typeof listAddresses>> = [];
  let dbReady = true;
  try {
    [orders, addresses] = await Promise.all([
      listOrdersForUser(userId),
      listAddresses(),
    ]);
  } catch (error) {
    dbReady = false;
    console.error("Account dashboard DB unavailable — run prisma migrate + generate:", error);
  }

  const recentOrders = orders.slice(0, 3);

  const stats = [
    { label: "Orders", value: orders.length, href: "/account/orders", icon: Package },
    {
      label: "Saved addresses",
      value: addresses.length,
      href: "/account/addresses",
      icon: MapPin,
    },
  ];

  return (
    <>
      {!dbReady ? (
        <div role="alert" className="glass-component border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-gray-primary">
          <p className="font-semibold">Database tables are missing.</p>
          <p className="mt-1 text-gray-tertiary">
            Run <code className="font-mono">npx prisma migrate dev --name demo_expansion</code> then{" "}
            <code className="font-mono">npx prisma generate</code> and{" "}
            <code className="font-mono">npx prisma db seed</code>, then refresh.
          </p>
        </div>
      ) : null}
      <section className="grid gap-4 sm:grid-cols-2">
        {stats.map(({ label, value, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="glass-component group flex items-center gap-4 p-5 transition-shadow hover:shadow-lift"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-action/60 text-action-foreground">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-2xl font-semibold tabular-nums text-gray-primary">
                {value}
              </span>
              <span className="block text-sm font-medium text-gray-tertiary">{label}</span>
            </span>
            <ChevronRight
              className="ml-auto size-4 text-gray-quaternary transition-transform duration-200 ease-out-quart group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        ))}
      </section>

      <section className="glass-component p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-gray-primary">
            Recent orders
          </h2>
          <Link
            href="/account/orders"
            className="text-sm font-semibold text-gray-tertiary transition-colors hover:text-gray-primary"
          >
            View all
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="rounded-2xl border border-white/40 bg-white/30 p-8 text-center">
            <ShoppingBag
              className="mx-auto mb-3 size-7 text-gray-quaternary"
              aria-hidden="true"
            />
            <p className="mb-1 font-semibold text-gray-primary">No orders yet</p>
            <p className="mb-5 text-sm text-gray-tertiary">
              Your order history will appear here after checkout.
            </p>
            <Link
              href="/products"
              className="inline-flex h-11 items-center justify-center rounded-full bg-action px-6 text-sm font-semibold text-action-foreground transition-colors hover:bg-action-hover"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-primary/10">
            {recentOrders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 transition-colors hover:text-gray-primary"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-xs text-gray-quaternary">
                      #{order.id.slice(0, 8)}
                    </span>
                    <span className="block text-sm font-medium text-gray-tertiary">
                      {dateFormatter.format(order.createdAt)}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-2">
                      <OrderStatusPill status={order.status} />
                      <FulfillmentStatusPill status={order.fulfillmentStatus} />
                    </span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-gray-primary">
                    {formatCents(order.totalCents)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
