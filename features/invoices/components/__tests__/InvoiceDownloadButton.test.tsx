// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  canDownloadInvoice,
  InvoiceDownloadButton,
} from "../InvoiceDownloadButton";

/**
 * Retro Batch 3 I2: invoice entitlement follows payment history, not the
 * current order status. A SUCCEEDED or REFUNDED payment keeps the invoice —
 * even when the order row itself is CANCELLED (every in-app refund flips the
 * order to CANCELLED) or its fulfillment was cancelled pre-shipment. PENDING
 * orders, PENDING/CANCELLED payments, and orders with no payment stay hidden.
 */

afterEach(cleanup);

const ORDER_ID = "order-1";

describe("InvoiceDownloadButton", () => {
  it("renders a download link for a PAID order with a succeeded payment", () => {
    render(
      <InvoiceDownloadButton
        orderId={ORDER_ID}
        status="PAID"
        paymentStatus="SUCCEEDED"
      />,
    );

    const link = screen.getByRole("link", { name: /download invoice/i });
    expect(link.getAttribute("href")).toBe("/orders/order-1/invoice");
  });

  it("keeps the link for a PAID order whose fulfillment was cancelled pre-shipment", () => {
    // The payment still succeeded, so the financial record exists even
    // though fulfillment never happened. (Old rule hid this shape; I2
    // changed entitlement to payment history.)
    const { container } = render(
      <InvoiceDownloadButton
        orderId={ORDER_ID}
        status="PAID"
        paymentStatus="SUCCEEDED"
      />,
    );

    expect(container.querySelector("a")).not.toBeNull();
  });

  it("keeps the link for a refunded order", () => {
    render(
      <InvoiceDownloadButton
        orderId={ORDER_ID}
        status="CANCELLED"
        paymentStatus="REFUNDED"
      />,
    );

    expect(
      screen.getByRole("link", { name: /download invoice/i }),
    ).toBeDefined();
  });

  it("renders nothing for a PENDING order even with a succeeded payment", () => {
    const { container } = render(
      <InvoiceDownloadButton
        orderId={ORDER_ID}
        status="PENDING"
        paymentStatus="SUCCEEDED"
      />,
    );

    expect(container.querySelector("a")).toBeNull();
    expect(screen.queryByRole("link", { name: /invoice/i })).toBeNull();
  });

  it("renders nothing for a PENDING payment", () => {
    const { container } = render(
      <InvoiceDownloadButton
        orderId={ORDER_ID}
        status="PENDING"
        paymentStatus="PENDING"
      />,
    );

    expect(container.querySelector("a")).toBeNull();
  });

  it("renders nothing for a CANCELLED order with a cancelled payment", () => {
    const { container } = render(
      <InvoiceDownloadButton
        orderId={ORDER_ID}
        status="CANCELLED"
        paymentStatus="CANCELLED"
      />,
    );

    expect(container.querySelector("a")).toBeNull();
  });

  it("renders nothing when there is no payment record", () => {
    const { container } = render(
      <InvoiceDownloadButton
        orderId={ORDER_ID}
        status="CANCELLED"
        paymentStatus={null}
      />,
    );

    expect(container.querySelector("a")).toBeNull();
  });

  it("preserves the guest token in the invoice link", () => {
    render(
      <InvoiceDownloadButton
        orderId={ORDER_ID}
        status="PAID"
        paymentStatus="SUCCEEDED"
        token="guest token/with?reserved"
      />,
    );

    const link = screen.getByRole("link", { name: /download invoice/i });
    expect(link.getAttribute("href")).toBe(
      "/orders/order-1/invoice?token=guest%20token%2Fwith%3Freserved",
    );
  });
});

describe("canDownloadInvoice", () => {
  it("is true for succeeded or refunded payments on non-pending orders", () => {
    expect(
      canDownloadInvoice({ status: "PAID", paymentStatus: "SUCCEEDED" }),
    ).toBe(true);
    expect(
      canDownloadInvoice({ status: "PAID", paymentStatus: "REFUNDED" }),
    ).toBe(true);
    expect(
      canDownloadInvoice({ status: "CANCELLED", paymentStatus: "REFUNDED" }),
    ).toBe(true);
    expect(
      canDownloadInvoice({ status: "CANCELLED", paymentStatus: "SUCCEEDED" }),
    ).toBe(true);
  });

  it("is false for pending orders, unconfirmed payments, and missing payments", () => {
    expect(
      canDownloadInvoice({ status: "PENDING", paymentStatus: "SUCCEEDED" }),
    ).toBe(false);
    expect(
      canDownloadInvoice({ status: "PENDING", paymentStatus: "PENDING" }),
    ).toBe(false);
    expect(
      canDownloadInvoice({ status: "PAID", paymentStatus: "PENDING" }),
    ).toBe(false);
    expect(
      canDownloadInvoice({ status: "CANCELLED", paymentStatus: "CANCELLED" }),
    ).toBe(false);
    expect(
      canDownloadInvoice({ status: "CANCELLED", paymentStatus: null }),
    ).toBe(false);
    expect(canDownloadInvoice({ status: "PAID", paymentStatus: null })).toBe(
      false,
    );
  });
});
