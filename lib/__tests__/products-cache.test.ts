import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Task 11: repeat product-detail views must not query Postgres again, and an
 * admin mutation must be able to drop that cached copy (a stale price is a
 * money bug).
 *
 * Prisma is the mock boundary so every assertion counts real database reads.
 * `unstable_cache` reaches Next's incremental cache through
 * `globalThis.__incrementalCache` when there is no request store, so the tests
 * install a small in-memory stand-in that honours both the 60s window and tag
 * busting — the same two contracts the app relies on in production.
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

import { PRODUCTS_CACHE_TAG } from "@/lib/cache-tags";
import { getProduct, getRelatedProducts } from "@/lib/products";

interface FetchCacheValue {
  kind: string;
  data: { body?: string };
  revalidate: number;
}

interface StoredEntry {
  value: FetchCacheValue;
  tags: string[];
  storedAt: number;
}

/**
 * Minimal incremental-cache double: keys by invocation key, expires entries
 * after their `revalidate` seconds, and drops entries by tag.
 */
function installIncrementalCache() {
  let clock = 0;
  const entries = new Map<string, StoredEntry>();

  const cache = {
    isOnDemandRevalidate: false,
    generateCacheKey(key: string) {
      return key;
    },
    async get(key: string) {
      const entry = entries.get(key);
      if (!entry) return null;
      if (clock - entry.storedAt >= entry.value.revalidate * 1000) {
        entries.delete(key);
        return null;
      }
      return { value: entry.value, isStale: false };
    },
    async set(
      key: string,
      value: FetchCacheValue,
      context: { tags?: string[] },
    ) {
      entries.set(key, {
        value,
        tags: context.tags ?? [],
        storedAt: clock,
      });
    },
    /** Test controls: advance the fake clock / purge by tag. */
    advance(ms: number) {
      clock += ms;
    },
    bustTag(tag: string) {
      for (const [key, entry] of entries) {
        if (entry.tags.includes(tag)) entries.delete(key);
      }
    },
    entries,
  };

  (globalThis as Record<string, unknown>).__incrementalCache = cache;
  return cache;
}

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

let cache: ReturnType<typeof installIncrementalCache>;

beforeEach(() => {
  vi.clearAllMocks();
  cache = installIncrementalCache();
  mocks.findFirst.mockImplementation(
    async ({ where }: { where: { slug: string } }) => makeRow(where.slug),
  );
  mocks.findMany.mockResolvedValue([makeRow()]);
  mocks.count.mockResolvedValue(1);
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).__incrementalCache;
});

describe("getProduct caching", () => {
  it("reads the database once when the same slug is requested twice", async () => {
    const first = await getProduct("alpha-product");
    const second = await getProduct("alpha-product");

    expect(mocks.findFirst).toHaveBeenCalledTimes(1);
    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: "alpha-product", status: "ACTIVE" },
      }),
    );
    expect(second).toEqual(first);
    expect(first?.slug).toBe("alpha-product");
  });

  it("keeps one cache entry per slug", async () => {
    await getProduct("alpha-product");
    const other = await getProduct("beta-product");

    expect(mocks.findFirst).toHaveBeenCalledTimes(2);
    expect(other?.slug).toBe("beta-product");
  });

  it("stores the detail entry under the products tag for 60 seconds", async () => {
    await getProduct("alpha-product");

    const entry = [...cache.entries.values()].find((candidate) =>
      candidate.tags.includes(PRODUCTS_CACHE_TAG),
    );
    expect(entry).toBeDefined();
    expect(entry?.value.revalidate).toBe(60);
    // The slug is part of the cache key, not just the stored payload.
    expect(
      [...cache.entries.keys()].some((key) => key.includes("alpha-product")),
    ).toBe(true);
  });

  it("reads the database again once the 60s window has elapsed", async () => {
    await getProduct("alpha-product");
    cache.advance(60_000);
    await getProduct("alpha-product");

    expect(mocks.findFirst).toHaveBeenCalledTimes(2);
  });

  it("reads the database again after an admin busts the products tag", async () => {
    await getProduct("alpha-product");
    cache.bustTag(PRODUCTS_CACHE_TAG);
    await getProduct("alpha-product");

    expect(mocks.findFirst).toHaveBeenCalledTimes(2);
  });
});

describe("getRelatedProducts caching", () => {
  it("reads the database once for repeated views of the same product", async () => {
    await getRelatedProducts("alpha-product");
    await getRelatedProducts("alpha-product");

    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    expect(mocks.count).toHaveBeenCalledTimes(1);
  });

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

  it("shares the products tag so an admin update drops it too", async () => {
    await getRelatedProducts("alpha-product");
    cache.bustTag(PRODUCTS_CACHE_TAG);
    await getRelatedProducts("alpha-product");

    expect(mocks.findMany).toHaveBeenCalledTimes(2);
  });
});
