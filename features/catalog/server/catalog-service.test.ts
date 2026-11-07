import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    category: {
      findMany: vi.fn(),
    },
    productImage: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    productVariant: {
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  archiveProduct,
  ensureDefaultVariant,
  getCatalogProduct,
  listCatalogProducts,
  listCategories,
  updateVariant,
  upsertProduct,
} from "./catalog-service";

const product = vi.mocked(prisma.product);
const category = vi.mocked(prisma.category);
const productImage = vi.mocked(prisma.productImage);
const productVariant = vi.mocked(prisma.productVariant);

const PRODUCT_INCLUDE = {
  category: true,
  images: { orderBy: { position: "asc" } },
  variants: { orderBy: [{ isDefault: "desc" }, { id: "asc" }] },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listCatalogProducts", () => {
  it("lists products with category/images/variants and deterministic ordering by default", async () => {
    product.findMany.mockResolvedValue([] as never);

    await listCatalogProducts();

    expect(product.findMany).toHaveBeenCalledWith({
      where: {},
      include: PRODUCT_INCLUDE,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: 50,
      skip: 0,
    });
  });

  it("applies search, status, and category filters", async () => {
    product.findMany.mockResolvedValue([] as never);

    await listCatalogProducts({
      search: "desk",
      status: "ACTIVE",
      categoryId: "cat-1",
    });

    expect(product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          title: { contains: "desk", mode: "insensitive" },
          status: "ACTIVE",
          categoryId: "cat-1",
        },
      }),
    );
  });

  it("clamps paging: take caps at 100, negative are neutralized", async () => {
    product.findMany.mockResolvedValue([] as never);

    await listCatalogProducts({ take: 250, skip: -10 });

    expect(product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100, skip: 0 }),
    );
  });
});

describe("listCategories", () => {
  it("returns id/slug/name summaries ordered by name", async () => {
    category.findMany.mockResolvedValue([] as never);

    await listCategories();

    expect(category.findMany).toHaveBeenCalledWith({
      select: { id: true, slug: true, name: true },
      orderBy: { name: "asc" },
    });
  });
});

describe("upsertProduct", () => {
  it("creates a product when no id is given, without inventing a status", async () => {
    product.create.mockResolvedValue({ id: "p1" } as never);

    const result = await upsertProduct({
      slug: "dream-desk",
      title: "Dream Desk",
      description: "A desk worth dreaming about.",
      categoryId: "cat-1",
    });

    expect(product.create).toHaveBeenCalledTimes(1);
    expect(product.update).not.toHaveBeenCalled();

    const createArgs = product.create.mock.calls[0]?.[0];
    expect(createArgs?.data).toMatchObject({
      slug: "dream-desk",
      title: "Dream Desk",
      description: "A desk worth dreaming about.",
      categoryId: "cat-1",
    });
    expect(createArgs?.data.status).toBeUndefined();

    expect(result).toEqual({ productId: "p1" });
  });

  it("updates the product when an id is given and keeps the status when none is provided", async () => {
    product.update.mockResolvedValue({ id: "p2" } as never);

    await upsertProduct({
      id: "p2",
      slug: "dream-desk",
      title: "Renamed Desk",
      description: "Updated copy.",
      categoryId: "cat-2",
    });

    expect(product.create).not.toHaveBeenCalled();
    expect(product.update).toHaveBeenCalledWith({
      where: { id: "p2" },
      data: {
        slug: "dream-desk",
        title: "Renamed Desk",
        description: "Updated copy.",
        categoryId: "cat-2",
      },
    });
  });

  it("applies status on update only when provided", async () => {
    product.update.mockResolvedValue({ id: "p2" } as never);

    await upsertProduct({
      id: "p2",
      slug: "dream-desk",
      title: "T",
      description: "D",
      categoryId: "cat-1",
      status: "DRAFT",
    });

    expect(product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "DRAFT" }),
      }),
    );
  });

  it("replaces images by position when images are provided", async () => {
    product.create.mockResolvedValue({ id: "p1" } as never);
    productImage.deleteMany.mockResolvedValue({ count: 2 } as never);
    productImage.createMany.mockResolvedValue({ count: 2 } as never);

    await upsertProduct({
      slug: "dream-desk",
      title: "T",
      description: "D",
      categoryId: "cat-1",
      images: ["https://cdn/desk-1.jpg", "https://cdn/desk-2.jpg"],
    });

    expect(productImage.deleteMany).toHaveBeenCalledWith({
      where: { productId: "p1" },
    });
    expect(productImage.createMany).toHaveBeenCalledWith({
      data: [
        { productId: "p1", url: "https://cdn/desk-1.jpg", position: 0 },
        { productId: "p1", url: "https://cdn/desk-2.jpg", position: 1 },
      ],
    });
  });

  it("clears images when an empty list is provided", async () => {
    product.update.mockResolvedValue({ id: "p2" } as never);

    await upsertProduct({
      id: "p2",
      slug: "dream-desk",
      title: "T",
      description: "D",
      categoryId: "cat-1",
      images: [],
    });

    expect(productImage.deleteMany).toHaveBeenCalledWith({
      where: { productId: "p2" },
    });
    expect(productImage.createMany).not.toHaveBeenCalled();
  });

  it("never touches images or variants when not requested", async () => {
    product.update.mockResolvedValue({ id: "p2" } as never);

    await upsertProduct({
      id: "p2",
      slug: "dream-desk",
      title: "T",
      description: "D",
      categoryId: "cat-1",
    });

    expect(productImage.deleteMany).not.toHaveBeenCalled();
    expect(productImage.createMany).not.toHaveBeenCalled();
    expect(productVariant.update).not.toHaveBeenCalled();
    expect(productVariant.upsert).not.toHaveBeenCalled();
  });
});

describe("ensureDefaultVariant", () => {
  it("idempotently creates a default variant keyed by slug, never overwriting existing stock", async () => {
    productVariant.upsert.mockResolvedValue({ sku: "default-dream-desk" } as never);

    await ensureDefaultVariant({
      productId: "p1",
      slug: "dream-desk",
      priceCents: 1999,
      onHand: 7,
    });

    expect(productVariant.upsert).toHaveBeenCalledWith({
      where: { sku: "default-dream-desk" },
      create: {
        productId: "p1",
        sku: "default-dream-desk",
        name: "Default",
        priceCents: 1999,
        currency: "USD",
        onHand: 7,
        reserved: 0,
        isDefault: true,
      },
      update: {},
    });
  });
});

describe("updateVariant", () => {
  it("updates price, stock, reserved, and name by id", async () => {
    productVariant.update.mockResolvedValue({ id: "v1" } as never);

    await updateVariant({
      id: "v1",
      name: "Walnut top",
      priceCents: 1899,
      onHand: 12,
      reserved: 3,
    });

    expect(productVariant.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: {
        name: "Walnut top",
        priceCents: 1899,
        onHand: 12,
        reserved: 3,
      },
    });
  });

  it("leaves name and reserved unchanged when omitted (undefined is a no-op in Prisma)", async () => {
    productVariant.update.mockResolvedValue({ id: "v1" } as never);

    await updateVariant({ id: "v1", priceCents: 1899, onHand: 12 });

    expect(productVariant.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: { name: undefined, priceCents: 1899, onHand: 12, reserved: undefined },
    });
  });
});

describe("archiveProduct", () => {
  it("sets status to ARCHIVED via update", async () => {
    product.update.mockResolvedValue({ id: "p1" } as never);

    await archiveProduct("p1");

    expect(product.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { status: "ARCHIVED" },
    });
  });

  it("never deletes products or variants: order history must survive", async () => {
    product.update.mockResolvedValue({ id: "p1" } as never);

    await archiveProduct("p1");

    expect(product.delete).not.toHaveBeenCalled();
    expect(product.deleteMany).not.toHaveBeenCalled();
    expect(productVariant.delete).not.toHaveBeenCalled();
  });
});

describe("getCatalogProduct", () => {
  it("loads one product with the same shape as list results", async () => {
    product.findUnique.mockResolvedValue(null as never);

    await getCatalogProduct("p1");

    expect(product.findUnique).toHaveBeenCalledWith({
      where: { id: "p1" },
      include: PRODUCT_INCLUDE,
    });
  });
});
