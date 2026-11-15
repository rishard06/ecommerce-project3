import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    coupon: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { CouponError, validateCoupon } from "./coupon-service";

const findUnique = vi.mocked(prisma.coupon.findUnique);

interface CouponFixture {
  id: string;
  code: string;
  percentOff: number | null;
  amountOffCents: number | null;
  minSubtotalCents: number;
  expiresAt: Date | null;
  maxUses: number | null;
  usedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

function coupon(overrides: Partial<CouponFixture> = {}): CouponFixture {
  return {
    id: "coupon-1",
    code: "SAVE10",
    percentOff: 10,
    amountOffCents: null,
    minSubtotalCents: 0,
    expiresAt: null,
    maxUses: null,
    usedCount: 0,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("validateCoupon", () => {
  it("rejects an unknown code", async () => {
    findUnique.mockResolvedValue(null);

    await expect(validateCoupon("NOPE", 5000)).rejects.toBeInstanceOf(
      CouponError,
    );
    expect(findUnique).toHaveBeenCalledWith({ where: { code: "NOPE" } });
  });

  it("rejects an expired coupon", async () => {
    findUnique.mockResolvedValue(
      coupon({ expiresAt: new Date("2020-01-01T00:00:00Z") }),
    );

    await expect(validateCoupon("SAVE10", 5000)).rejects.toThrow(/expired/i);
  });

  it("rejects a coupon whose usage limit is reached", async () => {
    findUnique.mockResolvedValue(
      coupon({ maxUses: 100, usedCount: 100 }),
    );

    await expect(validateCoupon("SAVE10", 5000)).rejects.toThrow(/limit|uses/i);
  });

  it("rejects a coupon when the subtotal is below its minimum", async () => {
    findUnique.mockResolvedValue(coupon({ minSubtotalCents: 5000 }));

    await expect(validateCoupon("SAVE10", 4999)).rejects.toThrow(/minimum|subtotal/i);
  });

  it("accepts a coupon when the subtotal meets its minimum", async () => {
    findUnique.mockResolvedValue(coupon({ minSubtotalCents: 5000 }));

    const result = await validateCoupon("SAVE10", 5000);

    expect(result).toEqual({ type: "PERCENT", value: 10, code: "SAVE10" });
  });

  it("returns PERCENT details for a percentage coupon", async () => {
    findUnique.mockResolvedValue(coupon({ percentOff: 15, amountOffCents: null }));

    await expect(validateCoupon("SAVE10", 2000)).resolves.toEqual({
      type: "PERCENT",
      value: 15,
      code: "SAVE10",
    });
  });

  it("returns FIXED details for a fixed-amount coupon", async () => {
    findUnique.mockResolvedValue(
      coupon({ code: "FLAT500", percentOff: null, amountOffCents: 500 }),
    );

    await expect(validateCoupon("FLAT500", 2000)).resolves.toEqual({
      type: "FIXED",
      value: 500,
      code: "FLAT500",
    });
  });

  it("normalizes lowercase codes before lookup", async () => {
    findUnique.mockResolvedValue(coupon());

    await validateCoupon("  save10 ", 2000);

    expect(findUnique).toHaveBeenCalledWith({ where: { code: "SAVE10" } });
  });

  it("rejects a blank code without touching the database", async () => {
    await expect(validateCoupon("   ", 2000)).rejects.toBeInstanceOf(
      CouponError,
    );

    expect(findUnique).not.toHaveBeenCalled();
  });

  it("rejects a coupon with neither discount configured", async () => {
    findUnique.mockResolvedValue(
      coupon({ percentOff: null, amountOffCents: null }),
    );

    await expect(validateCoupon("SAVE10", 2000)).rejects.toBeInstanceOf(
      CouponError,
    );
  });

  it("rejects a coupon with both discounts configured", async () => {
    findUnique.mockResolvedValue(
      coupon({ percentOff: 10, amountOffCents: 500 }),
    );

    await expect(validateCoupon("SAVE10", 2000)).rejects.toBeInstanceOf(
      CouponError,
    );
  });
});
