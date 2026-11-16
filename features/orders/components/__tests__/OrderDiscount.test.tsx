// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  AdminOrderCouponCell,
  auditActionLabel,
  OrderDiscountRow,
} from "../OrderDiscount";

afterEach(cleanup);

const SHOP_ROW = {
  rowClassName: "flex items-center justify-between",
  termClassName: "font-medium text-gray-tertiary",
  valueClassName: "font-semibold tabular-nums text-gray-secondary",
};

const ADMIN_ROW = {
  rowClassName: "flex items-center justify-between gap-3",
  termClassName: "text-muted-foreground",
  valueClassName: "tabular-nums",
};

function shopTotals(discountCents: number, couponCode: string | null) {
  return render(
    <dl>
      <div>
        <dt>Subtotal</dt>
        <dd>$44.98</dd>
      </div>
      <OrderDiscountRow
        discountCents={discountCents}
        couponCode={couponCode}
        {...SHOP_ROW}
      />
      <div>
        <dt>Shipping</dt>
        <dd>$0.00</dd>
      </div>
    </dl>,
  );
}

describe("OrderDiscountRow", () => {
  it("renders Discount (CODE) -$X.XX between Subtotal and Shipping (shop markup)", () => {
    const { container } = shopTotals(500, "SAVE10");

    const terms = Array.from(container.querySelectorAll("dt")).map(
      (term) => term.textContent,
    );
    expect(terms).toEqual(["Subtotal", "Discount (SAVE10)", "Shipping"]);
    expect(screen.getByText("-$5.00")).toBeDefined();
  });

  it("renders the same discount row with the admin totals markup", () => {
    const { container } = render(
      <dl>
        <div>
          <dt>Subtotal</dt>
          <dd>$44.98</dd>
        </div>
        <OrderDiscountRow
          discountCents={500}
          couponCode="SAVE10"
          {...ADMIN_ROW}
        />
        <div>
          <dt>Shipping</dt>
          <dd>$0.00</dd>
        </div>
      </dl>,
    );

    const terms = Array.from(container.querySelectorAll("dt")).map(
      (term) => term.textContent,
    );
    expect(terms).toEqual(["Subtotal", "Discount (SAVE10)", "Shipping"]);
    expect(
      within(container).getByText("Discount (SAVE10)"),
    ).toBeDefined();
    expect(within(container).getByText("-$5.00")).toBeDefined();
  });

  it("renders nothing when the order has no discount", () => {
    const { container } = shopTotals(0, null);

    const terms = Array.from(container.querySelectorAll("dt")).map(
      (term) => term.textContent,
    );
    expect(terms).toEqual(["Subtotal", "Shipping"]);
  });

  it("renders a codeless Discount label when cents exist without a code", () => {
    const { container } = shopTotals(250, null);

    const terms = Array.from(container.querySelectorAll("dt")).map(
      (term) => term.textContent,
    );
    expect(terms).toEqual(["Subtotal", "Discount", "Shipping"]);
    expect(within(container).getByText("-$2.50")).toBeDefined();
  });
});

describe("AdminOrderCouponCell", () => {
  it("shows the coupon code and discount amount", () => {
    const { container } = render(
      <AdminOrderCouponCell couponCode="SAVE10" discountCents={500} />,
    );

    expect(container.textContent).toContain("SAVE10");
    expect(container.textContent).toContain("-$5.00");
  });

  it("shows an em dash when no coupon was used", () => {
    const { container } = render(
      <AdminOrderCouponCell couponCode={null} discountCents={0} />,
    );

    expect(container.textContent?.trim()).toBe("—");
  });
});

describe("auditActionLabel", () => {
  it("labels cancel/refund audit actions instead of raw enum tokens", () => {
    expect(auditActionLabel("ORDER_CANCELLED")).toBe("Order cancelled");
    expect(auditActionLabel("ORDER_REFUNDED")).toBe("Refund issued");
    expect(auditActionLabel("FULFILLMENT_UPDATED")).toBe(
      "Fulfillment updated",
    );
  });

  it("labels return lifecycle audit actions instead of raw enum tokens", () => {
    expect(auditActionLabel("RETURN_REQUESTED")).toBe("Return requested");
    expect(auditActionLabel("RETURN_APPROVED")).toBe("Return approved");
    expect(auditActionLabel("RETURN_REJECTED")).toBe("Return rejected");
  });

  it("passes unknown actions through unchanged", () => {
    expect(auditActionLabel("PAYMENT_AFTER_RELEASE")).toBe(
      "PAYMENT_AFTER_RELEASE",
    );
  });
});
