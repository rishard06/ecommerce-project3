/**
 * Admin dashboard read service.
 *
 * Contains no authorization: the page calls `requireAdmin()` before invoking
 * it. Revenue is computed here from database rows (never from client input) and
 * stays in integer cents.
 *
 * The order scan is intentionally unfiltered at the current scale: it powers
 * all-time stats and the trailing-twelve-month buckets in one round trip.
 * Switch to `groupBy`/count queries when the order table grows large.
 */

import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/features/admin/lib/relative-time";
import type {
  AdminDashboardData,
  DashboardActivity,
  DashboardRecentOrder,
  FulfillmentSlice,
  MonthlyMetric,
  OrderStatusSlice,
} from "@/features/admin/types";
import type { FulfillmentStatus, OrderStatus } from "@/features/orders/types";

/** Dashboard order-status mix, always rendered in this order. */
const ORDER_STATUSES: readonly OrderStatus[] = ["PAID", "PENDING", "CANCELLED"];

/** Fulfillment mix for PAID orders, always rendered in this order. */
const FULFILLMENT_STATUSES: readonly FulfillmentStatus[] = [
  "UNFULFILLED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

const MONTH_COUNT = 12;
const RECENT_LIMIT = 6;
const monthLabel = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});

interface MonthBucket extends MonthlyMetric {
  customerIds: Set<string>;
}

/** Rounds a percentage to one decimal so the UI never renders long fractions. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Percentage change vs the prior month; null means "no prior month to compare". */
function pctChange(current: number, previous: number): number | null {
  return previous === 0 ? null : round1(((current - previous) / previous) * 100);
}

function sharePct(count: number, total: number): number {
  return total === 0 ? 0 : round1((count / total) * 100);
}

/**
 * Reads everything the admin dashboard renders: headline stats, twelve monthly
 * buckets, order/fulfillment mixes, recent orders and the latest audit entries.
 *
 * `now` is injectable so tests (and later server-rendered pages) get a stable
 * window without mocking the clock.
 */
export async function getAdminDashboardData(
  now: Date = new Date(),
): Promise<AdminDashboardData> {
  const windowStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTH_COUNT - 1), 1),
  );

  const [orders, recentOrderRows, activityRows] = await Promise.all([
    prisma.order.findMany({
      select: {
        id: true,
        createdAt: true,
        status: true,
        totalCents: true,
        userId: true,
        fulfillmentStatus: true,
      },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: RECENT_LIMIT,
      select: {
        id: true,
        createdAt: true,
        fulfillmentStatus: true,
        totalCents: true,
        currency: true,
        shippingFullName: true,
        guestEmail: true,
        user: { select: { name: true, email: true } },
        items: {
          take: 1,
          orderBy: { id: "asc" },
          select: { title: true },
        },
      },
    }),
    prisma.orderAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: RECENT_LIMIT,
      select: {
        id: true,
        orderId: true,
        action: true,
        fromStatus: true,
        toStatus: true,
        createdAt: true,
      },
    }),
  ]);

  const startYear = windowStart.getUTCFullYear();
  const startMonth = windowStart.getUTCMonth();
  const buckets: MonthBucket[] = Array.from({ length: MONTH_COUNT }, (_, offset) => ({
    month: monthLabel.format(
      new Date(Date.UTC(startYear, startMonth + offset, 1)),
    ),
    revenueCents: 0,
    orders: 0,
    customerIds: new Set<string>(),
  }));

  let revenueCents = 0;
  const allCustomerIds = new Set<string>();

  for (const order of orders) {
    if (order.status === "PAID") {
      revenueCents += order.totalCents;
    }
    if (order.userId) {
      allCustomerIds.add(order.userId);
    }

    if (order.createdAt < windowStart) {
      continue;
    }

    const offset =
      (order.createdAt.getUTCFullYear() - startYear) * 12 +
      (order.createdAt.getUTCMonth() - startMonth);
    if (offset < 0 || offset >= MONTH_COUNT) {
      continue;
    }

    const bucket = buckets[offset];
    bucket.orders += 1;
    if (order.status === "PAID") {
      bucket.revenueCents += order.totalCents;
    }
    if (order.userId) {
      bucket.customerIds.add(order.userId);
    }
  }

  const current = buckets[MONTH_COUNT - 1];
  const previous = buckets[MONTH_COUNT - 2];
  const paidOrders = orders.filter((order) => order.status === "PAID");

  const statuses: OrderStatusSlice[] = ORDER_STATUSES.map((status) => {
    const count = orders.filter((order) => order.status === status).length;
    return { status, count, sharePct: sharePct(count, orders.length) };
  });

  const fulfillment: FulfillmentSlice[] = FULFILLMENT_STATUSES.map((status) => {
    const count = paidOrders.filter(
      (order) => order.fulfillmentStatus === status,
    ).length;
    return { status, count, sharePct: sharePct(count, paidOrders.length) };
  });

  const recentOrders: DashboardRecentOrder[] = recentOrderRows.map((order) => ({
    id: order.id,
    createdAt: order.createdAt,
    customerName: order.user?.name ?? order.shippingFullName,
    customerEmail: order.user?.email ?? order.guestEmail ?? "guest",
    itemTitle: order.items[0]?.title ?? null,
    fulfillmentStatus: order.fulfillmentStatus,
    totalCents: order.totalCents,
    // Storefront orders are USD-only; the view model keeps that literal.
    currency: order.currency as "USD",
  }));

  const activity: DashboardActivity[] = activityRows.map((entry) => ({
    id: entry.id,
    orderId: entry.orderId,
    action: entry.action,
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    createdAt: entry.createdAt,
    timeAgo: formatRelativeTime(entry.createdAt, now),
  }));

  return {
    stats: {
      revenueCents,
      orderCount: orders.length,
      customerCount: allCustomerIds.size,
      revenueDeltaPct: pctChange(current.revenueCents, previous.revenueCents),
      orderDeltaPct: pctChange(current.orders, previous.orders),
      customerDeltaPct: pctChange(
        current.customerIds.size,
        previous.customerIds.size,
      ),
    },
    monthly: buckets.map(({ month, revenueCents: bucketRevenue, orders: count }) => ({
      month,
      revenueCents: bucketRevenue,
      orders: count,
    })),
    statuses,
    fulfillment,
    recentOrders,
    activity,
  };
}
