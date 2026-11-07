import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    category: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getActiveProduct,
  getFeatureProducts,
  listActiveProducts,
} from "./storefront-service";

const product = vi.mocked(prisma.product);

interface VariantFixture {
  id: string;
  productId: string;
  sku: string;
  name: string;
  priceCents: number;
  currency: string;
  onHand: number;
  reserved: number;
  isDefault: boolean;
}

interface RowFixture {
  id: string;
  slug: string;
  title: string;
  description: string;
  brand: string | null;
  status: string;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
  rating: number;
  reviews: unknown;
  features: string[];
  category: {
    id: string;
    slug: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  };
  images: { id: string; productId: string; url: string; position: number }[];
  variants: VariantFixture[];
}

function makeVariant(overrides: Partial<VariantFixture> = {}): VariantFixture {
  return {
    id: "variant-1",
    productId: "product-1",
    sku: "dummy-1",
    name: "Default",
    priceCents: 1999,
    currency: "USD",
    onHand: 25,
    reserved: 0,
    isDefault: true,
    ...overrides,
  };
}

function makeRow(overrides: Partial<RowFixture> = {}): RowFixture {
  return {
    id: "product-1",
    slug: "dummy-1",
    title: "Essence Mascara",
    description: "The Essence Mascara gives a striking eyelash look.",
    brand: "Essence",
    status: "ACTIVE",
    categoryId: "cat-1",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    rating: 4.94,
    reviews: [
      {
        rating: 5,
        comment: "Great product!",
        date: "2024-05-01T10:00:00Z",
        reviewerName: "Alice",
      },
      {
        rating: 2,
        comment: "Not for me.",
        date: "2024-06-01T10:00:00Z",
        reviewerName: "Bob",
      },
    ],
    features: ["1 year warranty", "Free shipping", "30 days return policy"],
    category: {
      id: "cat-1",
      slug: "beauty",
      name: "Beauty",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    },
    images: [
      {
        id: "img-1",
        productId: "product-1",
        url: "https://cdn.dummyjson.com/src/product-1.webp",
        position: 0,
      },
      {
        id: "img-2",
        productId: "product-1",
        url: "https://cdn.dummyjson.com/src/product-2.webp",
        position: 1,
      },
    ],
    variants: [makeVariant()],
    ...overrides,
  };
}

const formattedDate = (iso: string) => new Date(iso).toLocaleDateString("en-US");

beforeEach(() => {
  vi.clearAllMocks();
  product.findMany.mockResolvedValue([] as never);
  product.count.mockResolvedValue(0 as never);
  product.findFirst.mockResolvedValue(null as never);
});

describe("listActiveProducts", () => {
  it("only queries ACTIVE products that have a variant, in deterministic slug order", async () => {
    await listActiveProducts();

    const call = product.findMany.mock.calls[0]?.[0];
    expect(call?.where).toMatchObject({ status: "ACTIVE" });
    expect(call?.where).toHaveProperty("variants");
    expect(call?.orderBy).toEqual([{ slug: "asc" }]);
  });

  it("filters by category slug when given and omits the filter otherwise", async () => {
    await listActiveProducts("electronics");
    const filtered = product.findMany.mock.calls[0]?.[0];
    expect(filtered?.where).toMatchObject({
      status: "ACTIVE",
      category: { slug: "electronics" },
    });

    vi.clearAllMocks();
    await listActiveProducts();
    const unfiltered = product.findMany.mock.calls[0]?.[0];
    expect(unfiltered?.where).not.toHaveProperty("category");
  });

  it("pages with skip/take, counts with the same filter, and echoes paging plus total", async () => {
    product.count.mockResolvedValue(47 as never);

    const page = await listActiveProducts("electronics", 40, 20);

    expect(product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 40, take: 20 }),
    );
    expect(product.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "ACTIVE",
          category: { slug: "electronics" },
        }),
      }),
    );
    expect(page).toEqual({ products: [], total: 47, skip: 40, take: 20 });
  });

  it("maps rows to summaries using the default variant's price and the first image", async () => {
    product.findMany.mockResolvedValue([makeRow()] as never);
    product.count.mockResolvedValue(1 as never);

    const page = await listActiveProducts();

    expect(page.products).toEqual([
      {
        slug: "dummy-1",
        title: "Essence Mascara",
        description: "The Essence Mascara gives a striking eyelash look.",
        priceCents: 1999,
        image: "https://cdn.dummyjson.com/src/product-1.webp",
        rating: 4.94,
        categorySlug: "beauty",
        categoryName: "Beauty",
        defaultVariantId: "variant-1",
        isPopular: true,
      },
    ]);
  });

  it("prefers the flagged default variant and falls back to the first variant", async () => {
    product.findMany.mockResolvedValue([
      makeRow({
        slug: "dummy-1",
        variants: [
          makeVariant({ id: "variant-a", sku: "dummy-1-a", priceCents: 100, isDefault: false }),
          makeVariant({ id: "variant-default", sku: "dummy-1", priceCents: 200, isDefault: true }),
        ],
      }),
      makeRow({
        id: "product-2",
        slug: "dummy-2",
        variants: [makeVariant({ id: "variant-b", sku: "dummy-2", priceCents: 300, isDefault: false })],
      }),
    ] as never);

    const page = await listActiveProducts();

    expect(page.products[0]).toMatchObject({
      defaultVariantId: "variant-default",
      priceCents: 200,
    });
    expect(page.products[1]).toMatchObject({
      defaultVariantId: "variant-b",
      priceCents: 300,
    });
  });

  it("drops variant-less products from the page", async () => {
    product.findMany.mockResolvedValue([
      makeRow(),
      makeRow({ id: "product-2", slug: "dummy-2", variants: [] }),
    ] as never);

    const page = await listActiveProducts();

    expect(page.products.map((p) => p.slug)).toEqual(["dummy-1"]);
  });

  it("marks only high ratings as popular", async () => {
    product.findMany.mockResolvedValue([
      makeRow({ rating: 4.94 }),
      makeRow({ id: "product-2", slug: "dummy-2", rating: 4.5 }),
      makeRow({ id: "product-3", slug: "dummy-3", rating: 3.1 }),
    ] as never);

    const page = await listActiveProducts();

    expect(page.products.map((p) => p.isPopular)).toEqual([true, false, false]);
  });
});

describe("getActiveProduct", () => {
  it("returns null for a missing slug", async () => {
    expect(await getActiveProduct("missing-slug")).toBeNull();
  });

  it("queries by slug with ACTIVE status only, so DRAFT/ARCHIVED rows never match", async () => {
    await getActiveProduct("dummy-1");

    expect(product.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "dummy-1", status: "ACTIVE" } }),
    );
  });

  it("returns null when an otherwise active product has no variant", async () => {
    product.findFirst.mockResolvedValue(makeRow({ variants: [] }) as never);

    expect(await getActiveProduct("dummy-1")).toBeNull();
  });

  it("maps a full detail view with images, features, variants, and default variant", async () => {
    product.findFirst.mockResolvedValue(makeRow() as never);

    const detail = await getActiveProduct("dummy-1");

    expect(detail).toEqual({
      slug: "dummy-1",
      title: "Essence Mascara",
      description: "The Essence Mascara gives a striking eyelash look.",
      priceCents: 1999,
      rating: 4.94,
      categorySlug: "beauty",
      categoryName: "Beauty",
      defaultVariantId: "variant-1",
      isPopular: true,
      images: [
        "https://cdn.dummyjson.com/src/product-1.webp",
        "https://cdn.dummyjson.com/src/product-2.webp",
      ],
      features: ["1 year warranty", "Free shipping", "30 days return policy"],
      reviews: [
        {
          id: "rev-0",
          userName: "Alice",
          rating: 5,
          date: formattedDate("2024-05-01T10:00:00Z"),
          title: "Great Product",
          content: "Great product!",
        },
        {
          id: "rev-1",
          userName: "Bob",
          rating: 2,
          date: formattedDate("2024-06-01T10:00:00Z"),
          title: "Feedback",
          content: "Not for me.",
        },
      ],
      reviewCount: 2,
      variants: [{ id: "variant-1", sku: "dummy-1", priceCents: 1999, onHand: 25 }],
      defaultVariant: { id: "variant-1", sku: "dummy-1", priceCents: 1999, onHand: 25 },
    });
  });

  it("treats null reviews as an empty list with zero count", async () => {
    product.findFirst.mockResolvedValue(makeRow({ reviews: null, rating: 0 }) as never);

    const detail = await getActiveProduct("dummy-1");

    expect(detail?.reviews).toEqual([]);
    expect(detail?.reviewCount).toBe(0);
    expect(detail?.isPopular).toBe(false);
  });
});

describe("getFeatureProducts", () => {
  it("orders by rating desc then slug asc, caps at the given limit, and stays ACTIVE-only", async () => {
    await getFeatureProducts(6);

    const call = product.findMany.mock.calls[0]?.[0];
    expect(call?.where).toMatchObject({ status: "ACTIVE" });
    expect(call?.where).toHaveProperty("variants");
    expect(call?.orderBy).toEqual([{ rating: "desc" }, { slug: "asc" }]);
    expect(call?.take).toBe(6);
  });

  it("defaults to a limit of 4", async () => {
    await getFeatureProducts();

    expect(product.findMany.mock.calls[0]?.[0]?.take).toBe(4);
  });

  it("returns summaries of the featured rows", async () => {
    product.findMany.mockResolvedValue([makeRow()] as never);

    const featured = await getFeatureProducts();

    expect(featured).toHaveLength(1);
    expect(featured[0]).toMatchObject({
      slug: "dummy-1",
      priceCents: 1999,
      defaultVariantId: "variant-1",
      image: "https://cdn.dummyjson.com/src/product-1.webp",
    });
  });
});
