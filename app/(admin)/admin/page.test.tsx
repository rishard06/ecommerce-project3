/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminDashboardData } from "@/features/admin/types";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getSession: vi.fn(),
  getAdminDashboardData: vi.fn(),
}));

vi.mock("@/features/identity/server/guards", () => ({
  requireAdmin: mocks.requireAdmin,
  getSession: mocks.getSession,
}));
vi.mock("@/features/admin/server/dashboard-service", () => ({
  getAdminDashboardData: mocks.getAdminDashboardData,
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/admin" }));
vi.mock("@/features/admin/components/AdminOverviewChart", () => ({
  AdminOverviewChart: () => <div data-testid="overview-chart" />,
}));

import AdminDashboardPage from "./page";

const DATA: AdminDashboardData = {
  stats: { revenueCents: 123400, orderCount: 12, customerCount: 34, revenueDeltaPct: 12.5, orderDeltaPct: -3.1, customerDeltaPct: null },
  monthly: Array.from({ length: 12 }, (_, i) => ({ month: `M${i}`, revenueCents: 0, orders: 0 })),
  statuses: [{ status: "PAID", count: 10, sharePct: 83.3 }, { status: "PENDING", count: 2, sharePct: 16.7 }, { status: "CANCELLED", count: 0, sharePct: 0 }],
  fulfillment: [{ status: "UNFULFILLED", count: 3, sharePct: 30 }, { status: "PROCESSING", count: 3, sharePct: 30 }, { status: "SHIPPED", count: 2, sharePct: 20 }, { status: "DELIVERED", count: 1, sharePct: 10 }, { status: "CANCELLED", count: 1, sharePct: 10 }],
  recentOrders: [{ id: "order-1", createdAt: new Date("2026-11-24T10:00:00Z"), customerName: "Emma Wilson", customerEmail: "emma@example.com", itemTitle: "Linen Bedding Set", fulfillmentStatus: "DELIVERED", totalCents: 29900, currency: "USD" }],
  activity: [{ id: "log-1", orderId: "order-1", action: "FULFILLMENT_UPDATED", fromStatus: "PROCESSING", toStatus: "SHIPPED", createdAt: new Date("2026-11-24T10:00:00Z"), timeAgo: "2 min ago" }],
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdmin.mockResolvedValue({ id: "admin-1", email: "ada@tended.store", role: "ADMIN" });
  mocks.getSession.mockResolvedValue({ user: { name: "Ada Doe", email: "ada@tended.store", image: null } });
  mocks.getAdminDashboardData.mockResolvedValue(DATA);
});

afterEach(cleanup);

describe("admin dashboard page", () => {
  it("renders the account shell, four nav links and real data", async () => {
    render(await AdminDashboardPage());

    expect(screen.getByText("Hello, Ada")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /orders/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /products/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /coupons/i })).toBeInTheDocument();
    expect(screen.getByText("$1,234.00")).toBeInTheDocument();
    expect(screen.getByText("Not tracked yet")).toBeInTheDocument();
    expect(screen.getByText("Emma Wilson")).toBeInTheDocument();
    expect(screen.getByText("$299.00")).toBeInTheDocument();
    expect(screen.getByTestId("overview-chart")).toBeInTheDocument();
  });

  it("stops before reading data when the admin guard rejects", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("Forbidden"));
    await expect(AdminDashboardPage()).rejects.toThrow("Forbidden");
    expect(mocks.getAdminDashboardData).not.toHaveBeenCalled();
  });
});
