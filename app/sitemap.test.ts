import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Task 07: `/sitemap.xml` is generated from the owned Prisma catalog, not a
 * hardcoded slug list. Sellability matches the storefront reads: only ACTIVE
 * products that have at least one variant are listed, and each entry carries
 * the product's `updatedAt`.
 */

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findMany: mocks.findMany,
    },
  },
}));

import sitemap from "./sitemap";

const UPDATED_AT = new Date("2026-02-03T04:05:06.000Z");

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://shop.example/");
  mocks.findMany.mockResolvedValue([
    { slug: "alpha-product", updatedAt: UPDATED_AT },
    { slug: "beta-product", updatedAt: UPDATED_AT },
  ]);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sitemap route", () => {
  it("lists product slugs from Prisma with their lastModified date", async () => {
    const entries = await sitemap();

    expect(entries.map((entry) => entry.url)).toEqual([
      "https://shop.example",
      "https://shop.example/products",
      "https://shop.example/products/alpha-product",
      "https://shop.example/products/beta-product",
    ]);
    expect(entries[2].lastModified).toEqual(UPDATED_AT);
  });

  it("queries only sellable ACTIVE products", async () => {
    await sitemap();

    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "ACTIVE", variants: { some: {} } },
        select: { slug: true, updatedAt: true },
      }),
    );
  });

  it("falls back to localhost when NEXT_PUBLIC_APP_URL is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", undefined);

    const entries = await sitemap();

    expect(entries[0].url).toBe("http://localhost:3000");
    expect(entries[0].url).not.toContain("shop.example");
  });
});
