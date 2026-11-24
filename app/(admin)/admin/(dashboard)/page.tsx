import type { Metadata } from "next";

import { AdminActivity } from "@/features/admin/components/admin-activity";
import { AdminFulfillmentCard } from "@/features/admin/components/admin-fulfillment-queue";
import { AdminNav } from "@/features/admin/components/AdminNav";
import { AdminOverviewChart } from "@/features/admin/components/AdminOverviewChart";
import { AdminRecentOrders } from "@/features/admin/components/admin-recent-orders";
import { AdminOrderStatusCard } from "@/features/admin/components/admin-order-status";
import { AdminStatCards } from "@/features/admin/components/admin-stat-cards";
import { getAdminDashboardData } from "@/features/admin/server/dashboard-service";
import { getSession, requireAdmin } from "@/features/identity/server/guards";

export const metadata: Metadata = { title: "Dashboard · Admin" };

/**
 * Admin dashboard: greeting + sidebar + the store's headline metrics.
 *
 * The route group layout already guards this page; `requireAdmin()` runs again
 * first so a rejected guard can never trigger the database read below.
 */
export default async function AdminDashboardPage() {
  await requireAdmin();

  const [session, data] = await Promise.all([
    getSession(),
    getAdminDashboardData(),
  ]);

  const firstName = session?.user?.name?.split(" ")[0] || "there";

  return (
    <main>
      <header className="mb-8 space-y-2 md:mb-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-tertiary">
          Admin
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-primary md:text-4xl">
          Hello, {firstName}
        </h1>
        <p className="text-sm text-gray-tertiary">
          Welcome back — here’s what’s happening with your store today.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
        <aside className="lg:col-span-3">
          <AdminNav
            user={{
              name: session?.user?.name ?? "Admin",
              email: session?.user?.email ?? "",
              image: session?.user?.image ?? null,
            }}
          />
        </aside>

        {/*
         * `min-w-0` on the column and `minmax(0, …)` on the rows keep the
         * 620px-wide recent-orders table scrolling inside its card instead of
         * pushing a page-level horizontal scrollbar.
         */}
        <div className="min-w-0 space-y-4 lg:col-span-9">
          <AdminStatCards stats={data.stats} />

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <AdminOverviewChart data={data.monthly} />
            <div className="grid gap-4">
              <AdminOrderStatusCard statuses={data.statuses} />
              <AdminFulfillmentCard fulfillment={data.fulfillment} />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <AdminRecentOrders orders={data.recentOrders} />
            <AdminActivity entries={data.activity} />
          </div>
        </div>
      </div>
    </main>
  );
}
