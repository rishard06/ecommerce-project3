// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Task 17 integration: the canonical order detail page (re-exported by the
 * account wrapper) carries the invoice link for paid orders and no link for
 * orders whose payment is not confirmed.
 *
 * Retro Batch 3 I1: the page also carries the return surface — a request
 * form for PAID + DELIVERED orders with no request yet, and a status block
 * (PENDING/APPROVED/REJECTED + reason) whenever a request exists.
 * Retro Batch 3 I2: invoice visibility follows payment history, so a
 * refunded (CANCELLED + REFUNDED) order keeps its link.
 */

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getOrderForViewer: vi.fn(),
  getReturnRequestForViewer: vi.fn(),
  requestReturnAction: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("@/features/identity/server/guards", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/features/orders/server/customer-order-service", () => ({
  getOrderForViewer: mocks.getOrderForViewer,
  cancelOrder: vi.fn(),
  OrderNotFoundError: class OrderNotFoundError extends Error {},
  OrderNotCancellableError: class OrderNotCancellableError extends Error {},
}));

vi.mock("@/features/returns/server/actions", () => ({
  getReturnRequestForViewer: mocks.getReturnRequestForViewer,
}));

vi.mock("@/features/returns/server/return-actions", () => ({
  requestReturnAction: mocks.requestReturnAction,
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import OrderDetailPage from "./page";

const ORDER = {
  id: "order-1",
  createdAt: new Date("2026-02-01T10:00:00.000Z"),
  status: "PAID",
  fulfillmentStatus: "UNFULFILLED",
  currency: "USD",
  subtotalCents: 3998,
  discountCents: 0,
  couponCode: null,
  shippingCents: 0,
  taxCents: 0,
  totalCents: 3998,
  items: [
    {
      id: "item-1",
      variantId: "variant-1",
      productSlug: "product-slug",
      sku: "SKU-1",
      title: "Snapshot product",
      unitPriceCents: 1999,
      quantity: 2,
      lineTotalCents: 3998,
    },
  ],
  shipping: {
    fullName: "Jane Doe",
    line1: "123 Main Street",
    line2: "Apt 4",
    city: "Springfield",
    region: "IL",
    postalCode: "62701",
    country: "US",
  },
  payment: {
    status: "SUCCEEDED",
    provider: "stripe",
    amountCents: 3998,
    currency: "USD",
  },
};

async function renderOrderPage(searchParams: { token?: string } = {}) {
  const ui = await OrderDetailPage({
    params: Promise.resolve({ id: "order-1" }),
    searchParams: Promise.resolve(searchParams),
  });
  return render(ui);
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
  mocks.getOrderForViewer.mockResolvedValue(ORDER);
  mocks.getReturnRequestForViewer.mockResolvedValue(null);
});

afterEach(cleanup);

describe("order detail invoice entry point", () => {
  it("shows the invoice link for a PAID order and preserves the guest token", async () => {
    await renderOrderPage({ token: "guest-token" });

    const link = screen.getByRole("link", { name: /download invoice/i });
    expect(link.getAttribute("href")).toBe(
      "/orders/order-1/invoice?token=guest-token",
    );
  });

  it("hides the invoice link while payment is still PENDING", async () => {
    mocks.getOrderForViewer.mockResolvedValue({
      ...ORDER,
      status: "PENDING",
      payment: { ...ORDER.payment, status: "PENDING" },
    });

    await renderOrderPage();

    expect(screen.queryByRole("link", { name: /invoice/i })).toBeNull();
  });

  it("hides the invoice link for a customer-cancelled order with no refund", async () => {
    // CANCELLED + payment CANCELLED means no money moved, so no receipt.
    mocks.getOrderForViewer.mockResolvedValue({
      ...ORDER,
      status: "CANCELLED",
      fulfillmentStatus: "CANCELLED",
      payment: { ...ORDER.payment, status: "CANCELLED" },
    });

    await renderOrderPage();

    expect(screen.queryByRole("link", { name: /invoice/i })).toBeNull();
  });

  it("keeps the invoice link for a refunded order", async () => {
    mocks.getOrderForViewer.mockResolvedValue({
      ...ORDER,
      status: "CANCELLED",
      fulfillmentStatus: "CANCELLED",
      payment: { ...ORDER.payment, status: "REFUNDED" },
    });

    await renderOrderPage();

    expect(
      screen.getByRole("link", { name: /download invoice/i }),
    ).toBeDefined();
  });
});

describe("order detail return surface", () => {
  it("shows the return request form for a PAID + DELIVERED order with no request", async () => {
    mocks.getOrderForViewer.mockResolvedValue({
      ...ORDER,
      fulfillmentStatus: "DELIVERED",
    });

    await renderOrderPage({ token: "guest-token" });

    expect(
      screen.getByRole("heading", { name: /return/i }),
    ).toBeDefined();
    expect(screen.getByLabelText(/reason/i)).toBeDefined();
    expect(
      screen.getByRole("button", { name: /request return/i }),
    ).toBeDefined();
  });

  it("shows the pending return status and reason instead of the form", async () => {
    mocks.getOrderForViewer.mockResolvedValue({
      ...ORDER,
      fulfillmentStatus: "DELIVERED",
    });
    mocks.getReturnRequestForViewer.mockResolvedValue({
      status: "PENDING",
      reason: "Too small",
      createdAt: new Date("2026-02-02T10:00:00.000Z"),
    });

    await renderOrderPage();

    expect(screen.getByText(/return requested/i)).toBeDefined();
    expect(screen.getByText("Too small")).toBeDefined();
    expect(
      screen.queryByRole("button", { name: /request return/i }),
    ).toBeNull();
    expect(
      mocks.getReturnRequestForViewer,
    ).toHaveBeenCalledWith("order-1", {
      userId: "user-1",
      guestToken: null,
    });
  });

  it("shows the approved return status on the cancelled order after a refund", async () => {
    mocks.getOrderForViewer.mockResolvedValue({
      ...ORDER,
      status: "CANCELLED",
      fulfillmentStatus: "CANCELLED",
      payment: { ...ORDER.payment, status: "REFUNDED" },
    });
    mocks.getReturnRequestForViewer.mockResolvedValue({
      status: "APPROVED",
      reason: "Defective",
      createdAt: new Date("2026-02-02T10:00:00.000Z"),
    });

    await renderOrderPage();

    expect(screen.getByText(/return approved/i)).toBeDefined();
    expect(screen.getByText("Defective")).toBeDefined();
  });

  it("hides the return surface for a PENDING order", async () => {
    mocks.getOrderForViewer.mockResolvedValue({
      ...ORDER,
      status: "PENDING",
      payment: { ...ORDER.payment, status: "PENDING" },
    });

    await renderOrderPage();

    expect(screen.queryByRole("heading", { name: /^returns?$/i })).toBeNull();
    expect(
      screen.queryByRole("button", { name: /request return/i }),
    ).toBeNull();
  });
});
