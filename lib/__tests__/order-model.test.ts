import { describe, it, expect } from "vitest";
import { getOrderTotals } from "@/lib/pricing";

describe("order totals demo", () => {
  it("adds shipping + tax + coupon", () => {
    // subtotal 100 - 10% DEMO10 = 90
    // shipping 4.99 + tax 90 * 1.5% (1.35) = 96.34
    expect(getOrderTotals(100, "standard", "DEMO10").total).toBeCloseTo(96.34);
  });
});
