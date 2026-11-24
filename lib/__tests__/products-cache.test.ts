import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Task 11: repeat product-detail views are served from Next's data cache, and
 * an admin mutation drops that cached copy (a stale price is a money bug).
 *
 * On Next 16 the cache lives behind `"use cache"` + `cacheLife`/`cacheTag`
 * (see `lib/products.ts`); the framework owns storage, expiry, and tag
 * busting, so unit tests cannot observe them through an in-memory double the
 * way the old `unstable_cache` tests did. These tests pin the contracts this
 * repo controls at the seam:
 *
 * - `getProduct`/`getRelatedProducts` register the shared products tag and a
 *   60s revalidate window on every read.
 * - reads delegate to the owned catalog with the same queries as before
 *   (slug + ACTIVE for detail; same-category-minus-self for related).
 * - tag invalidation itself is covered by `admin-actions.test.ts`
 *   (`updateTag(PRODUCTS_CACHE_TAG)` on every mutation).
 *
 * Prisma is the mock boundary so every assertion counts real database reads.
 */

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findFirst: mocks.findFirst,
      findMany: mocks.findMany,
      count: mocks.count,
    },
  },
}));

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}));

import { cacheLife, cacheTag } from "next/cache";
import { PRODUCTS_CACHE_TAG } from "@/lib/cache-tags";
import { getProduct, getRelatedProducts } from "@/lib/products";

/** Row as returned by the detail read (`PRODUCT_DETAIL_INCLUDE`). */
function makeRow(slug = "alpha-product") {
  return {
    id: `product-${slug}`,
    slug,
    title: "Alpha Product",
    description: "A considered everyday essential.",
    brand: "Acme",
    status: "ACTIVE",
    categoryId: "cat-home",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    rating: 4.8,
    reviews: null,
    features: ["Free shipping"],
    _count: { userReviews: 0 },
    category: {
      id: "cat-home",
      slug: "home",
      name: "Home",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    },
    images: [
      {
        id: "img-1",
        productId: `product-${slug}`,
        url: "https://cdn.example.com/alpha-1.webp",
        position: 0,
      },
    ],
    variants: [
      {
        id: "variant-1",
        productId: `product-${slug}`,
        sku: "ALPHA-1",
        name: "Default",
        priceCents: 2999,
        currency: "USD",
        onHand: 7,
        reserved: 0,
        isDefault: true,
      },
    ],
  };
}

const cacheLifeMock = vi.mocked(cacheLife);
const cacheTagMock = vi.mocked(cacheTag);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findFirst.mockImplementation(
    async ({ where }: { where: { slug: string } }) => makeRow(where.slug),
  );
  mocks.findMany.mockResolvedValue([makeRow()]);
  mocks.count.mockResolvedValue(1);
});

describe("getProduct caching", () => {
  it("reads the active product by slug", async () => {
    const first = await getProduct("alpha-product");

    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: "alpha-product", status: "ACTIVE" },
      }),
    );
    expect(first?.slug).toBe("alpha-product");
  });

  it("registers the shared products tag so an admin update drops it", async () => {
    await getProduct("alpha-product");

    expect(cacheTagMock).toHaveBeenCalledWith(PRODUCTS_CACHE_TAG);
  });

  it("keeps the 60s revalidate window", async () => {
    await getProduct("alpha-product");

    expect(cacheLifeMock).toHaveBeenCalledWith(
      expect.objectContaining({ revalidate: 60 }),
    );
  });
});

describe("getRelatedProducts caching", () => {
  it("queries the product's own category while excluding the product", async () => {
    await getRelatedProducts("alpha-product", 5);

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { category: { products: { some: { slug: "alpha-product" } } } },
            { slug: { not: "alpha-product" } },
          ]),
        }),
        skip: 0,
        take: 5,
      }),
    );
  });

  it("shares the products tag and 60s window so an admin update drops it too", async () => {
    await getRelatedProducts("alpha-product");

    expect(cacheTagMock).toHaveBeenCalledWith(PRODUCTS_CACHE_TAG);
    expect(cacheLifeMock).toHaveBeenCalledWith(
      expect.objectContaining({ revalidate: 60 }),
    );
  });
});
