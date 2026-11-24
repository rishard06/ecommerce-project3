/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AdminRecentOrders } from "./admin-recent-orders";
import type { DashboardRecentOrder } from "../types";

afterEach(cleanup);

const order: DashboardRecentOrder = {
  id: "order-12345678", createdAt: new Date("2026-11-24T10:00:00Z"),
  customerName: "Emma Wilson", customerEmail: "emma@example.com",
  itemTitle: "Linen Bedding Set", fulfillmentStatus: "DELIVERED",
  totalCents: 29900, currency: "USD",
};

describe("AdminRecentOrders", () => {
  it("renders the order table inside a horizontal scroller", () => {
    const { container } = render(<AdminRecentOrders orders={[order]} />);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Emma Wilson")).toBeInTheDocument();
    expect(screen.getByText("$299.00")).toBeInTheDocument();
    expect(screen.getByText("Delivered")).toBeInTheDocument();
    expect(container.querySelector(".overflow-x-auto")).not.toBeNull();
  });

  it("falls back to guest data and shows an empty state", () => {
    render(<AdminRecentOrders orders={[{ ...order, customerName: "Guest Buyer", customerEmail: "guest", itemTitle: null }]} />);
    expect(screen.getByText("Guest Buyer")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    cleanup();
    render(<AdminRecentOrders orders={[]} />);
    expect(screen.getByText(/no orders yet/i)).toBeInTheDocument();
  });
});
