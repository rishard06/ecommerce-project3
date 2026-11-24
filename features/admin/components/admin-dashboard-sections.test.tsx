/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AdminStatCards } from "./admin-stat-cards";
import { AdminOrderStatusCard } from "./admin-order-status";
import { AdminFulfillmentCard } from "./admin-fulfillment-queue";

afterEach(cleanup);

const stats = {
  revenueCents: 123400, orderCount: 12, customerCount: 34,
  revenueDeltaPct: 12.5, orderDeltaPct: -3.1, customerDeltaPct: null,
};

describe("summary cards", () => {
  it("renders real values, signed deltas, and the Page Views placeholder", () => {
    render(<AdminStatCards stats={stats} />);
    expect(screen.getByText("$1,234.00")).toBeInTheDocument();
    expect(screen.getByText(/\+12\.5%/)).toBeInTheDocument();
    expect(screen.getByText(/-3\.1%/)).toBeInTheDocument();
    expect(screen.getByText("Page Views")).toBeInTheDocument();
    expect(screen.getByText("Not tracked yet")).toBeInTheDocument();
  });

  it("renders every order status with a zero-safe share", () => {
    render(<AdminOrderStatusCard statuses={[
      { status: "PAID", count: 2, sharePct: 50 },
      { status: "PENDING", count: 1, sharePct: 25 },
      { status: "CANCELLED", count: 1, sharePct: 25 },
    ]} />);
    expect(screen.getByText("PAID")).toBeInTheDocument();
    expect(screen.getByText("PENDING")).toBeInTheDocument();
    expect(screen.getByText("CANCELLED")).toBeInTheDocument();
    expect(screen.queryByText("NaN")).not.toBeInTheDocument();
  });

  it("renders fulfillment progress values from paid orders", () => {
    render(<AdminFulfillmentCard fulfillment={[
      { status: "UNFULFILLED", count: 3, sharePct: 50 },
      { status: "PROCESSING", count: 2, sharePct: 33.3 },
      { status: "SHIPPED", count: 0, sharePct: 0 },
      { status: "DELIVERED", count: 0, sharePct: 0 },
      { status: "CANCELLED", count: 1, sharePct: 16.7 },
    ]} />);
    expect(screen.getAllByRole("progressbar")[0]).toHaveAttribute("aria-valuenow", "50");
  });

  it("shows empty states when nothing exists", () => {
    render(<AdminOrderStatusCard statuses={[]} />);
    expect(screen.getByText(/no orders yet/i)).toBeInTheDocument();
    cleanup();
    render(<AdminFulfillmentCard fulfillment={[]} />);
    expect(screen.getByText(/no paid orders/i)).toBeInTheDocument();
  });
});
