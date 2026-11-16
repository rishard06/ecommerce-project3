// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Retro Batch 3 I1: the admin orders list exposes return state so pending
 * requests are discoverable without opening every delivered order.
 */

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  listOrdersForAdmin: vi.fn(),
}));

vi.mock("@/features/identity/server/guards", () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock("@/features/orders/server/admin-order-service", () => ({
  listOrdersForAdmin: mocks.listOrdersForAdmin,
}));

import AdminOrdersPage from "./page";

const BASE = {
  id: "order-1",
  createdAt: new Date("2026-02-01T10:00:00.000Z"),
  status: "PAID",
  fulfillmentStatus: "DELIVERED",
  customerEmail: "customer@example.com",
  currency: "USD",
  subtotalCents: 3998,
  discountCents: 0,
  couponCode: null,
  shippingCents: 0,
  taxCents: 0,
  totalCents: 3998,
  paymentStatus: "SUCCEEDED",
} as const;

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdmin.mockResolvedValue({ id: "admin-1" });
  mocks.listOrdersForAdmin.mockResolvedValue([
    { ...BASE, id: "order-pending", returnRequestStatus: "PENDING" },
    { ...BASE, id: "order-none", returnRequestStatus: null },
  ]);
});

afterEach(cleanup);

describe("admin orders list return column", () => {
  it("renders a Return column with a pending badge and an empty marker", async () => {
    const ui = await AdminOrdersPage();
    const { container } = render(ui);

    expect(
      screen.getByRole("columnheader", { name: /return/i }),
    ).toBeDefined();
    expect(screen.getByText(/return pending/i)).toBeDefined();
    expect(container.textContent).toContain("—");
  });
});
