import { describe, expect, it } from "vitest";

import { getOrderTotals, TAX_RATE } from "../pricing";

describe("getOrderTotals", () => {
  it("keeps the 1.5% tax rate", () => {
    expect(TAX_RATE).toBe(0.015);
  });

  it("returns zero totals for an empty subtotal", () => {
    expect(getOrderTotals(0)).toEqual({
      subtotalCents: 0,
      shippingCents: 0,
      taxCents: 0,
      totalCents: 0,
    });
  });

  it.each([
    { subtotalCents: 1999, taxCents: 30, totalCents: 2029 },
    { subtotalCents: 10000, taxCents: 150, totalCents: 10150 },
    { subtotalCents: 19999, taxCents: 300, totalCents: 20299 },
  ])(
    "computes integer-cent tax and total for $subtotalCents",
    ({ subtotalCents, taxCents, totalCents }) => {
      expect(getOrderTotals(subtotalCents)).toEqual({
        subtotalCents,
        shippingCents: 0,
        taxCents,
        totalCents,
      });
    },
  );

  it("only ever returns integers", () => {
    for (const subtotalCents of [0, 1, 999, 1999, 33333, 100000]) {
      const totals = getOrderTotals(subtotalCents);

      expect(Number.isInteger(totals.subtotalCents)).toBe(true);
      expect(Number.isInteger(totals.shippingCents)).toBe(true);
      expect(Number.isInteger(totals.taxCents)).toBe(true);
      expect(Number.isInteger(totals.totalCents)).toBe(true);
    }
  });

  it("rejects negative subtotals", () => {
    expect(() => getOrderTotals(-1)).toThrow(/negative/i);
  });

  it("rejects fractional subtotals", () => {
    expect(() => getOrderTotals(19.99)).toThrow(/integer/i);
  });

  it("rejects non-finite subtotals", () => {
    expect(() => getOrderTotals(Number.NaN)).toThrow(/finite/i);
    expect(() => getOrderTotals(Number.POSITIVE_INFINITY)).toThrow(/finite/i);
  });
});
