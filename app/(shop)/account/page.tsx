import Link from "next/link";
import { ChevronRight, MapPin, Package, ShoppingBag } from "lucide-react";
import { listOrdersForUser } from "@/features/orders/server/customer-order-service";
import { listAddresses } from "@/features/account/address-actions";
import { requireAccountSession } from "@/features/account/require-session";
import { formatCents } from "@/lib/money";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default async function AccountPage() {
  const session = await requireAccountSession();
  let orders: Awaited<ReturnType<typeof listOrdersForUser>> = [];
  let addresses: Awaited<ReturnType<typeof listAddresses>> = [];
  let dbReady = true;
  try {
    [orders, addresses] = await Promise.all([
      listOrdersForUser(session.user.id),
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
    <div className="space-y-6">
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
            <span className="flex size-12 items-center justify-center rounded-full bg-accent-500/60 text-gray-primary">
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
              className="inline-flex h-11 items-center justify-center rounded-full bg-gray-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-gray-secondary"
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
                      {dateFormatter.format(order.createdAt)} · {order.status.toLowerCase()}
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
