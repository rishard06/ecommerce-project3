import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
    address: { create: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
    product: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn().mockResolvedValue(null) } },
}));

import { prisma } from "@/lib/prisma";
import { createOrderAction } from "@/features/checkout/actions";

describe("createOrderAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid postal + qty 0", async () => {
    const r = await createOrderAction({
      shipping: {
        firstName: "A",
        lastName: "B",
        address: "x",
        city: "y",
        postalCode: "1",
        country: "US",
      },
      method: "standard",
      payment: { cardLast4: "4242" },
      items: [{ id: 1, quantity: 0 }],
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown product", async () => {
    (prisma.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const r = await createOrderAction({
      shipping: {
        firstName: "Jane",
        lastName: "Doe",
        address: "123 Main Street",
        city: "Springfield",
        postalCode: "12345",
        country: "US",
      },
      method: "standard",
      payment: { cardLast4: "4242" },
      items: [{ id: 999999, quantity: 1 }],
    });
    expect(r.success).toBe(false);
  });
});
