// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Task 17 RED: the print-friendly invoice route must gate on the same
 * `getOrderForViewer` ownership predicate as the order detail page and render
 * ONLY the Task 16 snapshot data.
 *
 * Retro Batch 3 I2: entitlement follows payment history. A refunded payment
 * keeps the route (200 + a "Refunded" marker) instead of 404ing; PENDING
 * orders and CANCELLED payments still 404 without reading invoice data.
 */

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getOrderForViewer: vi.fn(),
  getInvoiceData: vi.fn(),
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
}));

vi.mock("@/features/invoices/server/render-invoice", () => ({
  getInvoiceData: mocks.getInvoiceData,
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
}));

import InvoicePage from "./page";

const ORDER = {
  id: "order-1",
  status: "PAID",
  fulfillmentStatus: "UNFULFILLED",
  payment: {
    status: "SUCCEEDED",
    provider: "stripe",
    amountCents: 4286,
    currency: "USD",
  },
} as const;

const INVOICE = {
  orderId: "order-1",
  createdAt: new Date("2026-02-01T10:00:00.000Z"),
  currency: "USD",
  couponCode: "SAVE10",
  lines: [
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
  subtotalCents: 3998,
  discountCents: 500,
  shippingCents: 500,
  taxCents: 288,
  totalCents: 4286,
};

async function renderInvoicePage(searchParams: { token?: string } = {}) {
  const ui = await InvoicePage({
    params: Promise.resolve({ id: "order-1" }),
    searchParams: Promise.resolve(searchParams),
  });
  return render(ui);
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
  mocks.getOrderForViewer.mockResolvedValue(ORDER);
  mocks.getInvoiceData.mockResolvedValue(INVOICE);
});

afterEach(cleanup);

describe("invoice route", () => {
  it("renders the Task 16 snapshot lines, totals, and shipping address", async () => {
    const { container } = await renderInvoicePage();

    expect(screen.getByRole("heading", { name: /invoice/i })).toBeDefined();
    expect(container.textContent).toContain("Snapshot product");
    expect(container.textContent).toContain("SKU-1");
    expect(container.textContent).toContain("$19.99");
    expect(container.textContent).toContain("$39.98");
    expect(container.textContent).toContain("Discount (SAVE10)");
    expect(container.textContent).toContain("-$5.00");
    expect(container.textContent).toContain("$42.86");
    expect(container.textContent).toContain("Jane Doe");
    expect(container.textContent).toContain("Springfield, IL 62701");
    expect(mocks.getInvoiceData).toHaveBeenCalledWith("order-1");
  });

  it("passes user + guest token to the shared ownership lookup", async () => {
    await renderInvoicePage({ token: "guest-token" });

    expect(mocks.getOrderForViewer).toHaveBeenCalledWith("order-1", {
      userId: "user-1",
      guestToken: "guest-token",
    });
  });

  it("renders a refunded order with a Refunded marker", async () => {
    mocks.getOrderForViewer.mockResolvedValue({
      ...ORDER,
      status: "CANCELLED",
      fulfillmentStatus: "CANCELLED",
      payment: { ...ORDER.payment, status: "REFUNDED" },
    });

    const { container } = await renderInvoicePage();

    expect(screen.getByRole("heading", { name: /invoice/i })).toBeDefined();
    expect(container.textContent).toContain("Snapshot product");
    expect(container.textContent).toMatch(/refunded/i);
    expect(mocks.getInvoiceData).toHaveBeenCalledWith("order-1");
  });

  it("renders a PAID order whose fulfillment was cancelled pre-shipment", async () => {
    // Payment succeeded, so the receipt survives the fulfillment cancel.
    mocks.getOrderForViewer.mockResolvedValue({
      ...ORDER,
      fulfillmentStatus: "CANCELLED",
    });

    const { container } = await renderInvoicePage();

    expect(screen.getByRole("heading", { name: /invoice/i })).toBeDefined();
    expect(container.textContent).toContain("Snapshot product");
  });

  it("404s a PENDING order without reading invoice data", async () => {
    mocks.getOrderForViewer.mockResolvedValue({
      ...ORDER,
      status: "PENDING",
    });

    await expect(renderInvoicePage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.getInvoiceData).not.toHaveBeenCalled();
  });

  it("404s a CANCELLED order with a cancelled payment without reading invoice data", async () => {
    mocks.getOrderForViewer.mockResolvedValue({
      ...ORDER,
      status: "CANCELLED",
      fulfillmentStatus: "CANCELLED",
      payment: { ...ORDER.payment, status: "CANCELLED" },
    });

    await expect(renderInvoicePage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.getInvoiceData).not.toHaveBeenCalled();
  });

  it("404s when the snapshot disappeared after the ownership check", async () => {
    mocks.getInvoiceData.mockResolvedValue(null);

    await expect(renderInvoicePage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("logs anonymous visitors without a guest token in", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.getOrderForViewer.mockResolvedValue(null);

    await expect(renderInvoicePage()).rejects.toThrow(
      "NEXT_REDIRECT:/login",
    );
  });
});
