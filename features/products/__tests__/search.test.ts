import { beforeEach, describe, expect, it, vi } from "vitest";

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
import { searchProducts } from "@/features/products/search";
import type { CatalogProductRow } from "@/features/catalog/server/catalog-view";

const product = vi.mocked(prisma.product);
const queryRaw = vi.mocked(prisma.$queryRaw);

function makeRow(overrides: Partial<CatalogProductRow> = {}): CatalogProductRow {
  return {
    id: "product-1",
    slug: "desk-1",
    title: "Standing Desk",
    description: "A height-adjustable desk.",
    brand: "Acme",
    status: "ACTIVE",
    categoryId: "cat-1",
    rating: 4.2,
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
        id: "img-1",
        productId: "product-1",
        url: "https://cdn.example.com/desk.webp",
        position: 0,
      },
    ],
    variants: [
      {
        id: "variant-1",
        productId: "product-1",
        sku: "desk-1",
        name: "Default",
        priceCents: 1999,
        currency: "USD",
        onHand: 10,
        reserved: 0,
        isDefault: true,
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  product.findMany.mockResolvedValue([] as never);
  product.count.mockResolvedValue(0 as never);
  queryRaw.mockResolvedValue([] as never);
});

describe("searchProducts", () => {
  it("matches the query against title and slug with case-insensitive contains", async () => {
    await searchProducts({ q: "desk" });

    expect(product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "ACTIVE",
          variants: { some: {} },
          AND: [
            {
              OR: [
                { title: { contains: "desk", mode: "insensitive" } },
                { slug: { contains: "desk", mode: "insensitive" } },
              ],
            },
          ],
        },
        orderBy: [{ slug: "asc" }],
      }),
    );
  });

  it("adds the category to the same AND clause as the query", async () => {
    await searchProducts({ q: "desk", category: "office" });

    expect(product.findMany.mock.calls[0]?.[0]?.where).toEqual({
      status: "ACTIVE",
      variants: { some: {} },
      AND: [
        { category: { slug: "office" } },
        {
          OR: [
            { title: { contains: "desk", mode: "insensitive" } },
            { slug: { contains: "desk", mode: "insensitive" } },
          ],
        },
      ],
    });
  });

  it("pages in the database and counts with the identical where", async () => {
    product.findMany.mockResolvedValue([makeRow({ slug: "desk-21" })] as never);
    product.count.mockResolvedValue(42 as never);

    const result = await searchProducts({
      q: "desk",
      category: "office",
      skip: 20,
      limit: 20,
    });

    expect(product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 20,
        orderBy: [{ slug: "asc" }],
      }),
    );

    const findCall = product.findMany.mock.calls[0]?.[0];
    const countCall = product.count.mock.calls[0]?.[0];
    expect(findCall?.where).toEqual(countCall?.where);
    expect(result.total).toBe(42);
    expect(result.products.map((entry) => entry.slug)).toEqual(["desk-21"]);
  });

  it("orders price sorts in the database by default-variant cents with slug tiebreak", async () => {
    queryRaw.mockResolvedValue([{ id: "product-2" }, { id: "product-1" }] as never);
    product.findMany.mockResolvedValue([
      makeRow({
        id: "product-1",
        slug: "a-desk",
        variants: [
          {
            ...makeRow().variants[0],
            id: "variant-1",
            sku: "a-desk",
            priceCents: 25000,
          },
        ],
      }),
      makeRow({
        id: "product-2",
        slug: "b-desk",
        variants: [
          {
            ...makeRow().variants[0],
            id: "variant-2",
            sku: "b-desk",
            priceCents: 9900,
          },
        ],
      }),
    ] as never);
    product.count.mockResolvedValue(2 as never);

    const result = await searchProducts({
      q: "desk",
      sort: "price-asc",
      skip: 4,
      limit: 2,
    });

    const sql = queryRaw.mock.calls[0]?.[0] as unknown as {
      text: string;
      values: unknown[];
    };
    expect(sql.text).toContain(
      'ORDER BY dv."priceCents" ASC, p."slug" ASC',
    );
    expect(sql.text).toContain("LIMIT");
    expect(sql.text).toContain("OFFSET");
    expect(sql.values).toEqual(expect.arrayContaining([2, 4]));
    expect(result.products.map((entry) => entry.slug)).toEqual([
      "b-desk",
      "a-desk",
    ]);
  });

  it("pushes rating ordering into the database query", async () => {
    await searchProducts({ sort: "rating", skip: 3, limit: 6 });

    expect(product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ rating: "desc" }, { slug: "asc" }],
        skip: 3,
        take: 6,
      }),
    );
  });

  it("propagates database errors instead of reporting an empty catalog", async () => {
    product.findMany.mockRejectedValue(new Error("database unavailable"));

    await expect(searchProducts({ q: "desk" })).rejects.toThrow(
      "database unavailable",
    );
  });
});
