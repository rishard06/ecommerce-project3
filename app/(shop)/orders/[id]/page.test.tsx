// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Task 17 integration: the canonical order detail page (re-exported by the
 * account wrapper) carries the invoice link for paid orders and no link for
 * orders whose payment is not confirmed.
 */

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getOrderForViewer: vi.fn(),
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

  it("hides the invoice link for a CANCELLED order", async () => {
    mocks.getOrderForViewer.mockResolvedValue({
      ...ORDER,
      status: "CANCELLED",
      fulfillmentStatus: "CANCELLED",
    });

    await renderOrderPage();

    expect(screen.queryByRole("link", { name: /invoice/i })).toBeNull();
  });
});
