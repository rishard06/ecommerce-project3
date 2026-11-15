import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/identity/server/guards", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/identity/server/guards")>();
  return {
    ...actual,
    requireAdmin: vi.fn(),
  };
});

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

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  ForbiddenError,
  UnauthorizedError,
  requireAdmin,
} from "@/features/identity/server/guards";
import { prisma } from "@/lib/prisma";
import {
  createCouponAction,
  deleteCouponAction,
  setCouponUsageAction,
  updateCouponAction,
} from "./actions";

const requireAdminMock = vi.mocked(requireAdmin);
const createMock = vi.mocked(prisma.coupon.create);
const updateMock = vi.mocked(prisma.coupon.update);
const deleteMock = vi.mocked(prisma.coupon.delete);

const ADMIN = { id: "admin-1", email: "admin@example.com", role: "ADMIN" } as const;

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.append(key, value);
  }
  return data;
}

function prismaError(code: string): Error {
  return Object.assign(new Error(code), { code });
}

const VALID_CREATE = {
  code: "SAVE10",
  percentOff: "10",
  minSubtotalCents: "0",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createCouponAction error mapping", () => {
  it("rejects ANONYMOUS callers before any write", async () => {
    requireAdminMock.mockRejectedValue(new UnauthorizedError());

    await expect(createCouponAction(form(VALID_CREATE))).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it("rejects CUSTOMER role before any write", async () => {
    requireAdminMock.mockRejectedValue(new ForbiddenError());

    await expect(createCouponAction(form(VALID_CREATE))).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it("maps duplicate codes (P2002) to the duplicate message", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    createMock.mockRejectedValue(prismaError("P2002"));

    const result = await createCouponAction(form(VALID_CREATE));

    expect(result).toEqual({
      success: false,
      error: "A coupon with that code already exists.",
    });
  });

  it("maps unexpected persistence failures to the generic outage message", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    createMock.mockRejectedValue(new Error("connection reset"));

    const result = await createCouponAction(form(VALID_CREATE));

    expect(result).toEqual({
      success: false,
      error: "Database unavailable. Please try again.",
    });
  });

  it("returns validation failures without touching the database", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);

    const result = await createCouponAction(
      form({ code: "BAD", percentOff: "10", amountOffCents: "5" }),
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/exactly one/i);
    expect(createMock).not.toHaveBeenCalled();
  });
});

describe("updateCouponAction error mapping", () => {
  const validUpdate = { ...VALID_CREATE, id: "coupon-1" };

  it("maps duplicate codes (P2002) to the in-use message", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    updateMock.mockRejectedValue(prismaError("P2002"));

    const result = await updateCouponAction(form(validUpdate));

    expect(result).toEqual({
      success: false,
      error: "That code is already in use.",
    });
  });

  it("maps missing rows (P2025) to the not-found message", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    updateMock.mockRejectedValue(prismaError("P2025"));

    const result = await updateCouponAction(form(validUpdate));

    expect(result).toEqual({ success: false, error: "Coupon not found." });
  });

  it("maps unexpected persistence failures to the generic outage message", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    updateMock.mockRejectedValue(new Error("connection reset"));

    const result = await updateCouponAction(form(validUpdate));

    expect(result).toEqual({
      success: false,
      error: "Database unavailable. Please try again.",
    });
  });
});

describe("setCouponUsageAction", () => {
  it("rejects non-admin callers before any write", async () => {
    requireAdminMock.mockRejectedValue(new ForbiddenError());

    await expect(
      setCouponUsageAction(form({ couponId: "coupon-1", usedCount: "0" })),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("sets an exact value", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    updateMock.mockResolvedValue({ id: "coupon-1", usedCount: 3 } as never);

    const result = await setCouponUsageAction(
      form({ couponId: "coupon-1", usedCount: "3" }),
    );

    expect(result).toEqual({ success: true });
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "coupon-1" },
      data: { usedCount: 3 },
    });
  });

  it("resets the count to zero", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    updateMock.mockResolvedValue({ id: "coupon-1", usedCount: 0 } as never);

    const result = await setCouponUsageAction(
      form({ couponId: "coupon-1", usedCount: "0" }),
    );

    expect(result).toEqual({ success: true });
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "coupon-1" },
      data: { usedCount: 0 },
    });
  });

  it("rejects negative and non-integer values without touching the database", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);

    for (const usedCount of ["-1", "2.5", "many"]) {
      const result = await setCouponUsageAction(
        form({ couponId: "coupon-1", usedCount }),
      );
      expect(result.success).toBe(false);
    }
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("maps missing rows (P2025) to the not-found message", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    updateMock.mockRejectedValue(prismaError("P2025"));

    const result = await setCouponUsageAction(
      form({ couponId: "coupon-1", usedCount: "0" }),
    );

    expect(result).toEqual({ success: false, error: "Coupon not found." });
  });

  it("maps unexpected persistence failures to the generic outage message", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    updateMock.mockRejectedValue(new Error("connection reset"));

    const result = await setCouponUsageAction(
      form({ couponId: "coupon-1", usedCount: "0" }),
    );

    expect(result).toEqual({
      success: false,
      error: "Database unavailable. Please try again.",
    });
  });
});

describe("deleteCouponAction error mapping", () => {
  it("maps missing rows (P2025) to the not-found message", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    deleteMock.mockRejectedValue(prismaError("P2025"));

    const result = await deleteCouponAction(form({ couponId: "coupon-1" }));

    expect(result).toEqual({ success: false, error: "Coupon not found." });
  });

  it("maps unexpected persistence failures to the generic outage message", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    deleteMock.mockRejectedValue(new Error("connection reset"));

    const result = await deleteCouponAction(form({ couponId: "coupon-1" }));

    expect(result).toEqual({
      success: false,
      error: "Database unavailable. Please try again.",
    });
  });
});
