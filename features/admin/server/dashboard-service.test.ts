import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: { findMany: vi.fn() },
    orderAuditLog: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { getAdminDashboardData } from "./dashboard-service";

const orderFindMany = vi.mocked(prisma.order.findMany);
const activityFindMany = vi.mocked(prisma.orderAuditLog.findMany);
const now = new Date("2026-11-24T12:00:00.000Z");

beforeEach(() => vi.clearAllMocks());

it("sums PAID revenue, counts all orders, and never divides by zero", async () => {
  orderFindMany.mockImplementation((args) =>
    args?.take === 6
      ? Promise.resolve([]) as never
      : Promise.resolve([
          { id: "a", createdAt: new Date("2026-11-02"), status: "PAID", totalCents: 1000, userId: "u1", fulfillmentStatus: "UNFULFILLED" },
          { id: "b", createdAt: new Date("2026-11-03"), status: "PAID", totalCents: 2000, userId: "u1", fulfillmentStatus: "PROCESSING" },
          { id: "c", createdAt: new Date("2026-11-04"), status: "PENDING", totalCents: 5000, userId: null, fulfillmentStatus: "UNFULFILLED" },
          { id: "d", createdAt: new Date("2026-11-05"), status: "CANCELLED", totalCents: 9000, userId: "u2", fulfillmentStatus: "CANCELLED" },
          { id: "e", createdAt: new Date("2026-11-06"), status: "PAID", totalCents: 4000, userId: "u3", fulfillmentStatus: "CANCELLED" },
        ]) as never,
  );
  activityFindMany.mockResolvedValue([] as never);

  const data = await getAdminDashboardData(now);

  expect(data.stats.revenueCents).toBe(7000);
  expect(data.stats.orderCount).toBe(5);
  expect(data.stats.customerCount).toBe(3);
  // Three of the five fixture orders are PAID (1000 + 2000 + 4000 = 7000), so
  // the brief's original 2/50% expectation contradicted its own revenue value.
  expect(data.statuses).toEqual([
    { status: "PAID", count: 3, sharePct: 60 },
    { status: "PENDING", count: 1, sharePct: 20 },
    { status: "CANCELLED", count: 1, sharePct: 20 },
  ]);
  expect(data.fulfillment.find((s) => s.status === "UNFULFILLED")?.count).toBe(1);
  expect(data.fulfillment.find((s) => s.status === "PROCESSING")?.count).toBe(1);
  expect(data.fulfillment.find((s) => s.status === "CANCELLED")?.count).toBe(1);
  expect(data.fulfillment.map((s) => s.status)).toEqual([
    "UNFULFILLED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED",
  ]);
});

it("zero-fills twelve months and returns null deltas without a prior month", async () => {
  orderFindMany.mockImplementation((args) =>
    args?.take === 6
      ? Promise.resolve([]) as never
      : Promise.resolve([
          { id: "a", createdAt: new Date("2026-11-10"), status: "PAID", totalCents: 1000, userId: "u1", fulfillmentStatus: "DELIVERED" },
        ]) as never,
  );
  activityFindMany.mockResolvedValue([] as never);

  const data = await getAdminDashboardData(now);

  expect(data.monthly).toHaveLength(12);
  expect(data.monthly[11]).toMatchObject({ revenueCents: 1000, orders: 1 });
  expect(data.monthly[10]).toMatchObject({ revenueCents: 0, orders: 0 });
  expect(data.stats.revenueDeltaPct).toBeNull();
  expect(data.stats.orderDeltaPct).toBeNull();
  expect(data.stats.customerDeltaPct).toBeNull();
});

it("maps recent orders, guest fallbacks, and audit timeAgo", async () => {
  orderFindMany.mockImplementation((args) =>
    args?.take === 6
      ? Promise.resolve([
          { id: "order-1", createdAt: new Date("2026-11-24T11:58:00Z"), fulfillmentStatus: "SHIPPED", totalCents: 29900, currency: "USD", shippingFullName: "Guest Buyer", guestEmail: null, user: null, items: [{ title: "Linen Bedding Set" }] },
        ]) as never
      : Promise.resolve([]) as never,
  );
  activityFindMany.mockResolvedValue([
    { id: "log-1", orderId: "order-1", action: "FULFILLMENT_UPDATED", fromStatus: "PROCESSING", toStatus: "SHIPPED", createdAt: new Date("2026-11-24T11:58:00Z") },
  ] as never);

  const data = await getAdminDashboardData(now);

  expect(data.recentOrders[0]).toMatchObject({
    customerName: "Guest Buyer", customerEmail: "guest", itemTitle: "Linen Bedding Set",
  });
  expect(data.activity[0]).toMatchObject({ action: "FULFILLMENT_UPDATED", timeAgo: "2 min ago" });
});
