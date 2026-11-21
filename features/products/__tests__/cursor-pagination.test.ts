import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Task 10: keyset ("cursor") paging is additive behind the existing skip/offset
 * path. Paging by `slug > cursor` stays stable when a product is inserted
 * mid-browse; `skip` links keep their old behaviour and offsets are never
 * accepted as cursors.
 */

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import {
  decodeCursor,
  encodeCursor,
  searchProducts,
} from "@/features/products/search";
import type { CatalogProductRow } from "@/features/catalog/server/catalog-view";

const product = vi.mocked(prisma.product);
const queryRaw = vi.mocked(prisma.$queryRaw);

function makeRow(slug: string): CatalogProductRow {
  return {
    id: `product-${slug}`,
    slug,
    title: slug,
    description: `${slug} description`,
    brand: "Acme",
    status: "ACTIVE",
    categoryId: "cat-1",
    rating: 4,
    reviews: null,
    features: [],
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    category: {
      id: "cat-1",
      slug: "office",
      name: "Office",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    },
    images: [
      {
        id: `img-${slug}`,
        productId: `product-${slug}`,
        url: `https://cdn.example.com/${slug}.webp`,
        position: 0,
      },
    ],
    variants: [
      {
        id: `variant-${slug}`,
        productId: `product-${slug}`,
        sku: slug,
        name: "Default",
        priceCents: 1999,
        currency: "USD",
        onHand: 10,
        reserved: 0,
        isDefault: true,
      },
    ],
  };
}

/**
 * In-memory stand-in for the drizzle rows query: honours the `slug > cursor`
 * keyset filter, the slug ordering, and skip/take, so a test can mutate the
 * catalog between two reads the way a concurrent insert would.
 */
let catalog: CatalogProductRow[] = [];

function installCatalog(rows: CatalogProductRow[]) {
  catalog = rows;
  product.findMany.mockImplementation((async (args: {
    where?: { slug?: { gt?: string } };
    skip?: number;
    take?: number;
  }) => {
    const gt = args?.where?.slug?.gt;
    const filtered = catalog
      .filter((row) => (typeof gt === "string" ? row.slug > gt : true))
      .sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
    const start = args?.skip ?? 0;
    const end =
      typeof args?.take === "number" ? start + args.take : undefined;
    return filtered.slice(start, end);
  }) as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  installCatalog([]);
  product.count.mockResolvedValue(0 as never);
  queryRaw.mockResolvedValue([] as never);
});

describe("cursor paging stability", () => {
  it("does not repeat a product when one is inserted mid-browse", async () => {
    installCatalog(["alpha", "bravo", "charlie", "delta", "echo"].map(makeRow));
    product.count.mockResolvedValue(5 as never);

    const page1 = await searchProducts({ limit: 2 });
    expect(page1.products.map((row) => row.slug)).toEqual(["alpha", "bravo"]);

    // A new product lands before the cursor while the shopper reads page 1.
    catalog.push(makeRow("aardvark"));

    // The old offset link is now off by one: it repeats "bravo".
    const page2BySkip = await searchProducts({ skip: 2, limit: 2 });
    expect(page2BySkip.products.map((row) => row.slug)).toEqual([
      "bravo",
      "charlie",
    ]);

    // The cursor link resumes strictly after the last product seen.
    const page2 = await searchProducts({
      cursor: encodeCursor("bravo"),
      limit: 2,
    });
    expect(page2.products.map((row) => row.slug)).toEqual(["charlie", "delta"]);

    const seen = [
      ...page1.products.map((row) => row.slug),
      ...page2.products.map((row) => row.slug),
    ];
    expect(new Set(seen).size).toBe(seen.length);
  });

  it("keeps page 2 on the cursor even when the insert sorts before it", async () => {
    installCatalog(
      ["a-product", "z-product", "m-product"].map(makeRow),
    );

    // Insert one row that sorts after the cursor and one that sorts before it.
    catalog.push(makeRow("zzz-product"), makeRow("aaa-product"));

    const page = await searchProducts({
      cursor: encodeCursor("m-product"),
      limit: 2,
    });

    expect(page.products.map((row) => row.slug)).toEqual([
      "z-product",
      "zzz-product",
    ]);
  });

  it("counts the full result set, not the rows after the cursor", async () => {
    installCatalog(["alpha", "bravo", "charlie"].map(makeRow));
    product.count.mockResolvedValue(3 as never);

    const result = await searchProducts({
      cursor: encodeCursor("alpha"),
      limit: 2,
    });

    expect(product.findMany.mock.calls[0]?.[0]?.where).toEqual({
      status: "ACTIVE",
      variants: { some: {} },
      slug: { gt: "alpha" },
    });
    expect(product.count.mock.calls[0]?.[0]?.where).toEqual({
      status: "ACTIVE",
      variants: { some: {} },
    });
    expect(result.total).toBe(3);
  });
});

describe("cursor encoding", () => {
  it("is opaque and round-trips the slug", () => {
    const cursor = encodeCursor("desk-1");

    expect(cursor).not.toContain("desk-1");
    expect(cursor).not.toBe("0");
    expect(decodeCursor(cursor)).toBe("desk-1");
  });

  it("rejects raw offsets, forged payloads and empty values", () => {
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor("")).toBeNull();
    expect(decodeCursor("20")).toBeNull();
    expect(decodeCursor("skip=20")).toBeNull();
    expect(decodeCursor(Buffer.from("20").toString("base64url"))).toBeNull();
  });
});

describe("skip compatibility", () => {
  it("still pages by offset when no cursor is supplied", async () => {
    installCatalog(["alpha", "bravo", "charlie"].map(makeRow));

    await searchProducts({ skip: 2, limit: 1 });

    const args = product.findMany.mock.calls[0]?.[0];
    expect(args).toMatchObject({ skip: 2, take: 1 });
    expect(args?.where).not.toHaveProperty("slug");
  });

  it("falls back to the offset path for an invalid cursor", async () => {
    installCatalog(["alpha", "bravo", "charlie"].map(makeRow));

    await searchProducts({ cursor: "20", skip: 1, limit: 2 });

    const args = product.findMany.mock.calls[0]?.[0];
    expect(args).toMatchObject({ skip: 1, take: 2 });
    expect(args?.where).not.toHaveProperty("slug");
  });

  it("leaves the price-sorted id query unchanged when a cursor is passed", async () => {
    queryRaw.mockResolvedValue([] as never);

    await searchProducts({
      sort: "price-asc",
      cursor: encodeCursor("bravo"),
      skip: 4,
      limit: 2,
    });

    const sql = queryRaw.mock.calls[0]?.[0] as unknown as {
      text: string;
      values: unknown[];
    };
    expect(sql.text).toContain("OFFSET");
    expect(sql.text).not.toContain("cursor");
    expect(sql.values).toEqual(expect.arrayContaining([2, 4]));
  });
});
