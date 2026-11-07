import { describe, expect, it } from "vitest";
import { assertCents, formatCents } from "../money";

describe("money", () => {
  describe("assertCents", () => {
    it("accepts_integer_cents", () => {
      expect(() => assertCents(0)).not.toThrow();
      expect(() => assertCents(1)).not.toThrow();
      expect(() => assertCents(1999)).not.toThrow();
    });

    it("rejects_fractional_and_negative_cents", () => {
      expect(() => assertCents(19.99)).toThrow();
      expect(() => assertCents(-1)).toThrow();
    });

    it("rejects_nan_and_non_finite_cents", () => {
      expect(() => assertCents(Number.NaN)).toThrow();
      expect(() => assertCents(Number.POSITIVE_INFINITY)).toThrow();
      expect(() => assertCents(Number.NEGATIVE_INFINITY)).toThrow();
    });
  });

  describe("formatCents", () => {
    it("formats_1999_as_usd", () => {
      expect(formatCents(1999)).toBe("$19.99");
    });

    it("formats_zero_as_usd", () => {
      expect(formatCents(0)).toBe("$0.00");
    });

    it("formats_whole_dollars", () => {
      expect(formatCents(100)).toBe("$1.00");
    });

    it("accepts_explicit_usd_currency", () => {
      expect(formatCents(1999, "USD")).toBe("$19.99");
    });

    it("rejects_invalid_cents", () => {
      expect(() => formatCents(19.99)).toThrow();
      expect(() => formatCents(-1)).toThrow();
    });
  });
});
