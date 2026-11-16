// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  canDownloadInvoice,
  InvoiceDownloadButton,
} from "../InvoiceDownloadButton";

/**
 * Task 17 RED: the invoice download entry point exists only for paid orders.
 *
 * The rule is deliberately explicit and testable:
 *   order.status === "PAID" && order.fulfillmentStatus !== "CANCELLED"
 * PAID covers orders that are unfulfilled, processing, shipped, or delivered
 * (those are fulfillment states, not order states). Pending-payment and
 * cancelled orders must never expose invoice data.
 */

afterEach(cleanup);

const ORDER_ID = "order-1";

describe("InvoiceDownloadButton", () => {
  it("renders a download link for a PAID order", () => {
    render(
      <InvoiceDownloadButton
        orderId={ORDER_ID}
        status="PAID"
        fulfillmentStatus="UNFULFILLED"
      />,
    );

    const link = screen.getByRole("link", { name: /download invoice/i });
    expect(link.getAttribute("href")).toBe("/orders/order-1/invoice");
  });

  it("keeps the link for PAID orders that are shipped or delivered", () => {
    for (const fulfillmentStatus of ["SHIPPED", "DELIVERED"] as const) {
      render(
        <InvoiceDownloadButton
          orderId={ORDER_ID}
          status="PAID"
          fulfillmentStatus={fulfillmentStatus}
        />,
      );

      expect(
        screen.getByRole("link", { name: /download invoice/i }),
      ).toBeDefined();
      cleanup();
    }
  });

  it("renders nothing for a PENDING order", () => {
    const { container } = render(
      <InvoiceDownloadButton
        orderId={ORDER_ID}
        status="PENDING"
        fulfillmentStatus="UNFULFILLED"
      />,
    );

    expect(container.querySelector("a")).toBeNull();
    expect(screen.queryByRole("link", { name: /invoice/i })).toBeNull();
  });

  it("renders nothing for a CANCELLED order", () => {
    const { container } = render(
      <InvoiceDownloadButton
        orderId={ORDER_ID}
        status="CANCELLED"
        fulfillmentStatus="CANCELLED"
      />,
    );

    expect(container.querySelector("a")).toBeNull();
  });

  it("renders nothing when fulfillment was cancelled on a PAID order", () => {
    const { container } = render(
      <InvoiceDownloadButton
        orderId={ORDER_ID}
        status="PAID"
        fulfillmentStatus="CANCELLED"
      />,
    );

    expect(container.querySelector("a")).toBeNull();
  });

  it("preserves the guest token in the invoice link", () => {
    render(
      <InvoiceDownloadButton
        orderId={ORDER_ID}
        status="PAID"
        fulfillmentStatus="UNFULFILLED"
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
  it("is true only for PAID, non-fulfillment-cancelled orders", () => {
    expect(
      canDownloadInvoice({
        status: "PAID",
        fulfillmentStatus: "UNFULFILLED",
      }),
    ).toBe(true);
    expect(
      canDownloadInvoice({ status: "PAID", fulfillmentStatus: "PROCESSING" }),
    ).toBe(true);
    expect(
      canDownloadInvoice({ status: "PAID", fulfillmentStatus: "SHIPPED" }),
    ).toBe(true);
    expect(
      canDownloadInvoice({ status: "PAID", fulfillmentStatus: "DELIVERED" }),
    ).toBe(true);
    expect(
      canDownloadInvoice({ status: "PAID", fulfillmentStatus: "CANCELLED" }),
    ).toBe(false);
    expect(
      canDownloadInvoice({
        status: "PENDING",
        fulfillmentStatus: "UNFULFILLED",
      }),
    ).toBe(false);
    expect(
      canDownloadInvoice({
        status: "CANCELLED",
        fulfillmentStatus: "CANCELLED",
      }),
    ).toBe(false);
  });
});
