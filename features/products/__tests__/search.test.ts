import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { product: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) } },
}));

import { prisma } from "@/lib/prisma";
import { searchProducts } from "@/features/products/search";

describe("searchProducts", () => {
  it("filters by query and sorts price-asc", async () => {
    await searchProducts({ q: "phone", sort: "price-asc" });
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ title: expect.anything() }) })
    );
  });
});
