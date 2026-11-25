import type { Metadata } from "next";

import { AdminActivity } from "@/features/admin/components/admin-activity";
import { AdminFulfillmentCard } from "@/features/admin/components/admin-fulfillment-queue";
import { AdminOverviewChart } from "@/features/admin/components/AdminOverviewChart";
import { AdminRecentOrders } from "@/features/admin/components/admin-recent-orders";
import { AdminOrderStatusCard } from "@/features/admin/components/admin-order-status";
import { AdminStatCards } from "@/features/admin/components/admin-stat-cards";
import { getAdminDashboardData } from "@/features/admin/server/dashboard-service";
import { getSession, requireAdmin } from "@/features/identity/server/guards";

export const metadata: Metadata = { title: "Dashboard · Admin" };

/**
 * Admin dashboard: greeting + the store's headline metrics.
 *
 * The admin nav sidebar lives in `app/(admin)/layout.tsx` so it persists
 * across every admin route; this page only owns its content column.
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

      <div className="space-y-4">
        <AdminStatCards stats={data.stats} />

        {/*
         * `minmax(0, …)` on the rows below keeps the 620px-wide
         * recent-orders table scrolling inside its card instead of pushing a
         * page-level horizontal scrollbar. The outer column's `min-w-0`
         * guard lives in the admin layout.
         */}
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
    </main>
  );
}
