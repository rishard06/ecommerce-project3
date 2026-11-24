/**
 * Admin dashboard view contracts.
 *
 * The dashboard reads existing order and audit rows only: no schema change and
 * no denormalized analytics tables. Money stays integer cents so the rendering
 * layer owns formatting (`formatCents`).
 */

import type { FulfillmentStatus, OrderStatus } from "@/features/orders/types";

/** One month of the trailing-twelve-month trend, oldest first. */
export interface MonthlyMetric {
  month: string;
  revenueCents: number;
  orders: number;
}

/** All-time headline metrics plus month-over-month deltas (null = no basis). */
export interface AdminDashboardStats {
  revenueCents: number;
  orderCount: number;
  customerCount: number;
  revenueDeltaPct: number | null;
  orderDeltaPct: number | null;
  customerDeltaPct: number | null;
}

/** Share of all orders in one lifecycle status. */
export interface OrderStatusSlice {
  status: OrderStatus;
  count: number;
  sharePct: number;
}

/** Share of PAID orders in one fulfillment status. */
export interface FulfillmentSlice {
  status: FulfillmentStatus;
  count: number;
  sharePct: number;
}

/** Latest order row for the dashboard's Recent Orders card. */
export interface DashboardRecentOrder {
  id: string;
  createdAt: Date;
  customerName: string;
  customerEmail: string;
  itemTitle: string | null;
  fulfillmentStatus: FulfillmentStatus;
  totalCents: number;
  currency: "USD";
}

/** Latest audit entry for the dashboard activity feed. */
export interface DashboardActivity {
  id: string;
  orderId: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  createdAt: Date;
  timeAgo: string;
  detail?: string;
}

/** Everything the admin dashboard page renders in one read. */
export interface AdminDashboardData {
  stats: AdminDashboardStats;
  monthly: MonthlyMetric[];
  statuses: OrderStatusSlice[];
  fulfillment: FulfillmentSlice[];
  recentOrders: DashboardRecentOrder[];
  activity: DashboardActivity[];
}
