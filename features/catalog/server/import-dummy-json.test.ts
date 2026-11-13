import { describe, expect, it } from "vitest";
import {
  importDummyCatalog,
  mapDummyProduct,
  type CatalogImportClient,
  type CatalogImportTx,
  type DummyProduct,
} from "./import-dummy-json";

const baseProduct: DummyProduct = {
  id: 7,
  title: "Wireless Headphones",
  description: "Over-ear wireless headphones.",
  category: "electronics",
  price: 19.99,
  brand: "AudioMax",
  images: [
    "https://cdn.dummyjson.com/src/product-1.webp",
    "https://cdn.dummyjson.com/src/product-2.webp",
  ],
  rating: 4.57,
  reviews: [
    {
      rating: 5,
      comment: "Great sound!",
      date: "2024-05-20T08:00:00Z",
      reviewerName: "Alice",
      reviewerEmail: "alice@example.com",
    },
    {
      rating: 3,
      comment: "Decent.",
      date: "2024-06-02T08:00:00Z",
      reviewerName: "Bob",
      reviewerEmail: "bob@example.com",
    },
  ],
  warrantyInformation: "1 year warranty",
  shippingInformation: "Free shipping",
  returnPolicy: "30 days return policy",
};

interface FakeCategory extends Record<string, unknown> {
  id: string;
  slug: string;
  name: string;
}

interface FakeProduct extends Record<string, unknown> {
  id: string;
  slug: string;
  title: string;
  description: string;
  brand: string | null;
  status: string;
  categoryId: string;
}

interface FakeVariant extends Record<string, unknown> {
  id: string;
  sku: string;
  name: string;
  priceCents: number;
  currency: string;
  onHand: number;
  reserved: number;
  isDefault: boolean;
  productId: string;
}

interface FakeImage {
  productId: string;
  url: string;
  position: number;
}

function createFakeClient(): CatalogImportClient & {
  categories: Map<string, FakeCategory>;
  products: Map<string, FakeProduct>;
  variants: Map<string, FakeVariant>;
  imagesByProductId: Map<string, FakeImage[]>;
  imageDeleteCount: () => number;
} {
  const categories = new Map<string, FakeCategory>();
  const products = new Map<string, FakeProduct>();
  const variants = new Map<string, FakeVariant>();
  const imagesByProductId = new Map<string, FakeImage[]>();
  let nextId = 0;
  const newId = () => `fake-id-${++nextId}`;
  let imageDeletes = 0;

  const tx: CatalogImportTx = {
    category: {
      upsert: async (args) => {
        const existing = categories.get(args.where.slug);
        if (existing) {
          const next = { ...existing, ...args.update };
          categories.set(args.where.slug, next);
          return next;
        }
        const created = { id: newId(), ...args.create };
        categories.set(args.where.slug, created);
        return created;
      },
    },
    product: {
      upsert: async (args) => {
        const existing = products.get(args.where.slug);
        if (existing) {
          const next = { ...existing, ...args.update } as FakeProduct;
          products.set(args.where.slug, next);
          return next;
        }
        const created = { id: newId(), ...args.create } as FakeProduct;
        products.set(args.where.slug, created);
        return created;
      },
    },
    productImage: {
      deleteMany: async (args: { where: { productId: string } }) => {
        imagesByProductId.delete(args.where.productId);
        imageDeletes += 1;
        return { count: 1 };
      },
      createMany: async (args) => {
        for (const image of args.data) {
          const list = imagesByProductId.get(image.productId) ?? [];
          list.push(image);
          imagesByProductId.set(image.productId, list);
        }
        return { count: args.data.length };
      },
    },
    productVariant: {
      upsert: async (args) => {
        const existing = variants.get(args.where.sku);
        if (existing) {
          const next = { ...existing, ...args.update } as FakeVariant;
          variants.set(args.where.sku, next);
          return next;
        }
        const created = { id: newId(), ...args.create } as FakeVariant;
        variants.set(args.where.sku, created);
        return created;
      },
    },
  };

  const client: CatalogImportClient = {
    category: tx.category,
    product: tx.product,
    productImage: tx.productImage,
    productVariant: tx.productVariant,
  };

  return Object.assign(client, {
    categories,
    products,
    variants,
    imagesByProductId,
    imageDeleteCount: () => imageDeletes,
  });
}

describe("mapDummyProduct", () => {
  it("converts floats to integer cents and uses stable dummy identifiers", () => {
    const seed = mapDummyProduct(baseProduct);

    expect(seed.priceCents).toBe(1999);
    expect(seed.currency).toBe("USD");
    expect(seed.onHand).toBe(25);
    expect(seed.reserved).toBe(0);
    expect(seed.slug).toBe("dummy-7");
    expect(seed.sku).toBe("dummy-7");
    expect(seed.title).toBe(baseProduct.title);
    expect(seed.description).toBe(baseProduct.description);
    expect(seed.brand).toBe("AudioMax");
    expect(seed.categorySlug).toBe("electronics");
    expect(seed.images).toEqual([
      "https://cdn.dummyjson.com/src/product-1.webp",
      "https://cdn.dummyjson.com/src/product-2.webp",
    ]);
  });

  it("maps repeatedly to byte-identical output", () => {
    expect(JSON.stringify(mapDummyProduct(baseProduct))).toBe(
      JSON.stringify(mapDummyProduct(baseProduct)),
    );
  });

  it("produces an empty image list when images are missing or blank", () => {
    const { images: _images, ...noImages } = baseProduct;
    expect(mapDummyProduct(noImages).images).toEqual([]);
    expect(mapDummyProduct({ ...baseProduct, images: [] }).images).toEqual([]);
  });

  it("omits the brand when it is missing or null", () => {
    const { brand: _brand, ...noBrand } = baseProduct;
    expect(mapDummyProduct(noBrand).brand).toBeUndefined();
    expect(mapDummyProduct({ ...baseProduct, brand: null }).brand).toBeUndefined();
  });

  it("rounds fractional prices to cents", () => {
    expect(mapDummyProduct({ ...baseProduct, price: 9.99 }).priceCents).toBe(999);
    expect(mapDummyProduct({ ...baseProduct, price: 12.345 }).priceCents).toBe(1235);
  });

  it("carries the rating, normalized reviews, and policy features", () => {
    const seed = mapDummyProduct(baseProduct);

    expect(seed.rating).toBe(4.57);
    expect(seed.reviews).toEqual([
      {
        rating: 5,
        comment: "Great sound!",
        date: "2024-05-20T08:00:00Z",
        reviewerName: "Alice",
      },
      {
        rating: 3,
        comment: "Decent.",
        date: "2024-06-02T08:00:00Z",
        reviewerName: "Bob",
      },
    ]);
    expect(seed.features).toEqual([
      "1 year warranty",
      "Free shipping",
      "30 days return policy",
    ]);
  });

  it("defaults the rating to 0, drops missing reviews, and filters empty policies", () => {
    const seed = mapDummyProduct({
      ...baseProduct,
      rating: undefined,
      reviews: undefined,
      warrantyInformation: undefined,
      shippingInformation: null,
      returnPolicy: "30 days",
    });

    expect(seed.rating).toBe(0);
    expect(seed.reviews).toEqual([]);
    expect(seed.features).toEqual(["30 days"]);
  });

  it("keeps review dates as raw source strings so mapping stays deterministic", () => {
    const seed = mapDummyProduct(baseProduct);

    expect(seed.reviews[0]?.date).toBe("2024-05-20T08:00:00Z");
  });
});

describe("importDummyCatalog", () => {
  const data = {
    categories: [{ slug: "electronics", name: "Electronics" }],
    products: [baseProduct],
  };

  it("creates one category, product, variant and its images", async () => {
    const client = createFakeClient();
    const result = await importDummyCatalog(client, data);

    expect(result).toEqual({ categories: 1, products: 1 });
    expect(client.categories.size).toBe(1);
    expect(client.products.size).toBe(1);
    expect(client.variants.size).toBe(1);
    expect(client.categories.get("electronics")?.name).toBe("Electronics");
    expect([...client.products.values()][0]).toMatchObject({
      slug: "dummy-7",
      status: "ACTIVE",
    });
    expect([...client.variants.values()][0]).toMatchObject({
      sku: "dummy-7",
      name: "Default",
      priceCents: 1999,
      currency: "USD",
      onHand: 25,
      reserved: 0,
      isDefault: true,
    });
    expect([...client.imagesByProductId.values()][0]).toEqual([
      {
        productId: expect.any(String),
        url: "https://cdn.dummyjson.com/src/product-1.webp",
        position: 0,
      },
      {
        productId: expect.any(String),
        url: "https://cdn.dummyjson.com/src/product-2.webp",
        position: 1,
      },
    ]);
  });

  it("persists rating, reviews, and features, and refreshes them on re-import", async () => {
    const client = createFakeClient();

    await importDummyCatalog(client, data);

    expect([...client.products.values()][0]).toMatchObject({
      slug: "dummy-7",
      rating: 4.57,
      reviews: [
        {
          rating: 5,
          comment: "Great sound!",
          date: "2024-05-20T08:00:00Z",
          reviewerName: "Alice",
        },
        {
          rating: 3,
          comment: "Decent.",
          date: "2024-06-02T08:00:00Z",
          reviewerName: "Bob",
        },
      ],
      features: ["1 year warranty", "Free shipping", "30 days return policy"],
    });

    await importDummyCatalog(client, {
      categories: [{ slug: "electronics", name: "Electronics" }],
      products: [
        {
          ...baseProduct,
          rating: 3.2,
          reviews: [
            {
              rating: 4,
              comment: "Ok for the price.",
              date: "2024-07-01T08:00:00Z",
              reviewerName: "Carol",
            },
          ],
          warrantyInformation: "6 months",
        },
      ],
    });

    expect(client.products.size).toBe(1);
    expect([...client.products.values()][0]).toMatchObject({
      rating: 3.2,
      reviews: [
        {
          rating: 4,
          comment: "Ok for the price.",
          date: "2024-07-01T08:00:00Z",
          reviewerName: "Carol",
        },
      ],
      features: ["6 months", "Free shipping", "30 days return policy"],
    });
  });

  it("does not rename or duplicate a pre-existing category when a product's category is missing from the payload", async () => {
    const client = createFakeClient();

    // First import knows the full category list.
    await importDummyCatalog(client, {
      categories: [
        { slug: "electronics", name: "Electronics" },
        { slug: "beauty", name: "Beauty" },
      ],
      products: [baseProduct],
    });

    // Second import has a partial category payload but still references "beauty".
    await importDummyCatalog(client, {
      categories: [{ slug: "electronics", name: "Electronics" }],
      products: [{ ...baseProduct, id: 8, category: "beauty" }],
    });

    expect(client.categories.size).toBe(2);
    expect(client.categories.get("beauty")?.name).toBe("Beauty");
    const product = [...client.products.values()].find((p) => p.slug === "dummy-8");
    expect(product?.categoryId).toBe(client.categories.get("beauty")?.id);
  });

  it("provisionally creates an unknown category on a fresh database, renaming it once the payload provides it", async () => {
    const client = createFakeClient();

    await importDummyCatalog(client, {
      categories: [],
      products: [baseProduct],
    });

    const provisional = client.categories.get("electronics");
    expect(provisional).toMatchObject({ slug: "electronics", name: "electronics" });
    const product = [...client.products.values()][0];
    expect(product?.categoryId).toBe(provisional?.id);

    // A later import that includes the payload renames it instead of duplicating.
    await importDummyCatalog(client, {
      categories: [{ slug: "electronics", name: "Electronics" }],
      products: [baseProduct],
    });
    expect(client.categories.size).toBe(1);
    expect(client.categories.get("electronics")?.name).toBe("Electronics");
  });

  it("updates existing rows on a second run instead of duplicating them", async () => {
    const client = createFakeClient();

    await importDummyCatalog(client, data);
    const firstImages = [...client.imagesByProductId.values()][0];
    expect(firstImages).toHaveLength(2);

    await importDummyCatalog(client, {
      categories: [{ slug: "electronics", name: "Electronics" }],
      products: [
        {
          ...baseProduct,
          title: "Wireless Headphones Pro",
          price: 24.5,
          images: ["https://cdn.dummyjson.com/src/product-2.webp"],
        },
      ],
    });

    expect(client.categories.size).toBe(1);
    expect(client.products.size).toBe(1);
    expect(client.variants.size).toBe(1);
    expect([...client.products.values()][0]).toMatchObject({
      slug: "dummy-7",
      title: "Wireless Headphones Pro",
    });
    expect([...client.variants.values()][0]).toMatchObject({ priceCents: 2450 });
    // Images are replaced, not appended: still one, at position 0.
    expect([...client.imagesByProductId.values()][0]).toEqual([
      {
        productId: expect.any(String),
        url: "https://cdn.dummyjson.com/src/product-2.webp",
        position: 0,
      },
    ]);
    expect(client.imageDeleteCount()).toBe(2);
  });
});
