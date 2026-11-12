import { describe, it, expect } from "vitest";
import {
  COUPONS,
  SHIPPING_RATES,
  getOrderTotals,
} from "@/lib/pricing";

describe("pricing constants", () => {
  it("exposes the demo shipping rates and coupon", () => {
    expect(SHIPPING_RATES).toEqual({
      standard: 4.99,
      express: 12.99,
      pickup: 0,
    });
    expect(COUPONS.DEMO10).toBe(0.1);
  });
});

describe("getOrderTotals", () => {
  it("charges standard shipping below the free-shipping threshold", () => {
    const totals = getOrderTotals(50);

    expect(totals.subtotal).toBe(50);
    expect(totals.shipping).toBe(4.99);
    expect(totals.tax).toBeCloseTo(0.75, 2);
    expect(totals.total).toBeCloseTo(55.74, 2);
    expect(totals.discount).toBe(0);
  });

  it("charges 12.99 for express shipping", () => {
    const totals = getOrderTotals(100, "express");

    expect(totals.shipping).toBe(12.99);
    expect(totals.tax).toBeCloseTo(1.5, 2);
    expect(totals.total).toBeCloseTo(114.49, 2);
  });

  it("charges no shipping for pickup", () => {
    const totals = getOrderTotals(100, "pickup");

    expect(totals.shipping).toBe(0);
    expect(totals.total).toBeCloseTo(101.5, 2);
  });

  it("makes standard shipping free only above 75", () => {
    const atThreshold = getOrderTotals(75, "standard");
    const aboveThreshold = getOrderTotals(75.01, "standard");

    expect(atThreshold.shipping).toBe(4.99);
    expect(aboveThreshold.shipping).toBe(0);
    expect(aboveThreshold.total).toBeCloseTo(75.01 * 1.015, 2);
  });

  it("keeps pickup free and express paid above the free-shipping threshold", () => {
    expect(getOrderTotals(100, "pickup").shipping).toBe(0);
    expect(getOrderTotals(100, "express").shipping).toBe(12.99);
  });

  it("applies DEMO10 to the standard order", () => {
    // 100 - 10% = 90; tax = 90 * 1.5% = 1.35
    // coupon orders keep the 4.99 standard rate: 90 + 4.99 + 1.35 = 96.34
    const totals = getOrderTotals(100, "standard", "DEMO10");

    expect(totals.discount).toBeCloseTo(10, 2);
    expect(totals.shipping).toBe(4.99);
    expect(totals.tax).toBeCloseTo(1.35, 2);
    expect(totals.total).toBeCloseTo(96.34, 2);
  });

  it("taxes the discounted subtotal, not the original subtotal", () => {
    // 80 - 8 = 72; below 75 so standard shipping stays 4.99.
    // tax = 72 * 1.5% = 1.08; total = 72 + 4.99 + 1.08 = 78.07
    const totals = getOrderTotals(80, "standard", "DEMO10");

    expect(totals.discount).toBeCloseTo(8, 2);
    expect(totals.shipping).toBe(4.99);
    expect(totals.tax).toBeCloseTo(1.08, 2);
    expect(totals.total).toBeCloseTo(78.07, 2);
  });

  it("does not apply free standard shipping to coupon orders", () => {
    expect(getOrderTotals(100, "standard", "DEMO10").shipping).toBe(4.99);
    expect(getOrderTotals(100, "express", "DEMO10").shipping).toBe(12.99);
  });

  it("keeps totals unchanged for an unknown coupon", () => {
    const withoutCoupon = getOrderTotals(50, "standard");
    const withInvalidCoupon = getOrderTotals(50, "standard", "NOT_A_REAL_CODE");

    expect(withInvalidCoupon).toEqual(withoutCoupon);
    expect(withInvalidCoupon.discount).toBe(0);
  });

  it("matches the checkout demo math", () => {
    // 100 - 10 (DEMO10) = 90
    // shipping = 4.99, tax = 90 * 1.5% = 1.35
    // total = 90 + 4.99 + 1.35 = 96.34
    expect(getOrderTotals(100, "standard", "DEMO10").total).toBeCloseTo(96.34, 2);
  });
});
