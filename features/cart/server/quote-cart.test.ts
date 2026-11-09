import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    productVariant: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    order: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { quoteCart } from "./quote-cart";
import type { CartItemInput } from "../types";

const findMany = vi.mocked(prisma.productVariant.findMany);
const createOrder = vi.mocked(prisma.order.create);
const createVariant = vi.mocked(prisma.productVariant.create);
const updateVariant = vi.mocked(prisma.productVariant.update);
const transaction = vi.mocked(prisma.$transaction);

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
  product: {
    slug: string;
    title: string;
    status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  };
}

function variant(overrides: Partial<VariantFixture> = {}): VariantFixture {
  return {
    id: "variant-1",
    productId: "product-1",
    sku: "dummy-1",
    name: "Default",
    priceCents: 1999,
    currency: "USD",
    onHand: 10,
    reserved: 0,
    isDefault: true,
    product: {
      slug: "dummy-1",
      title: "Wireless Headphones",
      status: "ACTIVE",
    },
    ...overrides,
  };
}

function withProduct(
  product: Partial<VariantFixture["product"]> | null,
  overrides: Partial<VariantFixture> = {},
): VariantFixture {
  const base = variant(overrides);
  return {
    ...base,
    product: product === null ? (null as never) : { ...base.product, ...product },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("quoteCart", () => {
  it("rejects an empty cart without touching the database", async () => {
    await expect(quoteCart([])).rejects.toThrow();

    expect(findMany).not.toHaveBeenCalled();
  });

  it.each([0, 11, 1.5])(
    "rejects an invalid quantity (%s) before reading variants",
    async (quantity) => {
      await expect(
        quoteCart([{ variantId: "variant-1", quantity }]),
      ).rejects.toThrow();

      expect(findMany).not.toHaveBeenCalled();
    },
  );

  it("merges duplicate variant lines by summing their quantities", async () => {
    findMany.mockResolvedValue([variant()] as never);

    const quote = await quoteCart([
      { variantId: "variant-1", quantity: 2 },
      { variantId: "variant-1", quantity: 3 },
    ]);

    expect(quote.items).toHaveLength(1);
    expect(quote.items[0]).toMatchObject({
      variantId: "variant-1",
      quantity: 5,
      unitPriceCents: 1999,
      lineTotalCents: 9995,
    });
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["variant-1"] } },
      }),
    );
  });

  it("rejects duplicate lines whose merged quantity exceeds the per-line maximum", async () => {
    await expect(
      quoteCart([
        { variantId: "variant-1", quantity: 6 },
        { variantId: "variant-1", quantity: 6 },
      ]),
    ).rejects.toThrow(/maximum of 10/i);

    expect(findMany).not.toHaveBeenCalled();
  });

  it("rejects an unknown variant", async () => {
    findMany.mockResolvedValue([variant()] as never);

    await expect(
      quoteCart([
        { variantId: "variant-1", quantity: 1 },
        { variantId: "variant-missing", quantity: 1 },
      ]),
    ).rejects.toThrow(/not available/i);
  });

  it("rejects a variant whose product is not ACTIVE", async () => {
    findMany.mockResolvedValue([withProduct({ status: "DRAFT" })] as never);

    await expect(
      quoteCart([{ variantId: "variant-1", quantity: 1 }]),
    ).rejects.toThrow(/not available/i);
  });

  it("rejects a variant whose product row is missing", async () => {
    findMany.mockResolvedValue([withProduct(null)] as never);

    await expect(
      quoteCart([{ variantId: "variant-1", quantity: 1 }]),
    ).rejects.toThrow(/not available/i);
  });

  it.each([-1, 19.99, Number.NaN])(
    "rejects an invalid database price (%s)",
    async (priceCents) => {
      findMany.mockResolvedValue([variant({ priceCents })] as never);

      await expect(
        quoteCart([{ variantId: "variant-1", quantity: 1 }]),
      ).rejects.toThrow(/price/i);
    },
  );

  it("ignores browser-supplied prices and always uses the database price", async () => {
    findMany.mockResolvedValue([variant()] as never);

    const tampered = [
      {
        variantId: "variant-1",
        quantity: 1,
        price: 1,
        priceCents: 1,
        unitPriceCents: 1,
        lineTotalCents: 1,
        title: "Free Headphones",
      },
    ] as unknown as CartItemInput[];

    const quote = await quoteCart(tampered);

    expect(quote.items[0]).toMatchObject({
      variantId: "variant-1",
      productSlug: "dummy-1",
      sku: "dummy-1",
      title: "Wireless Headphones",
      unitPriceCents: 1999,
      quantity: 1,
      lineTotalCents: 1999,
    });
    expect(findMany).toHaveBeenCalledWith({
      where: { id: { in: ["variant-1"] } },
      include: { product: { select: { slug: true, title: true, status: true } } },
    });
  });

  it("returns exact integer-cent line, tax, and order totals", async () => {
    findMany.mockResolvedValue([
      variant(),
      variant({
        id: "variant-2",
        sku: "dummy-2",
        priceCents: 500,
        product: { slug: "dummy-2", title: "Sticker Pack", status: "ACTIVE" },
      }),
    ] as never);

    const quote = await quoteCart([
      { variantId: "variant-1", quantity: 2 },
      { variantId: "variant-2", quantity: 1 },
    ]);

    expect(quote.items).toEqual([
      {
        variantId: "variant-1",
        productSlug: "dummy-1",
        title: "Wireless Headphones",
        sku: "dummy-1",
        unitPriceCents: 1999,
        quantity: 2,
        lineTotalCents: 3998,
      },
      {
        variantId: "variant-2",
        productSlug: "dummy-2",
        title: "Sticker Pack",
        sku: "dummy-2",
        unitPriceCents: 500,
        quantity: 1,
        lineTotalCents: 500,
      },
    ]);
    expect(quote.subtotalCents).toBe(4498);
    expect(quote.shippingCents).toBe(0);
    expect(quote.taxCents).toBe(67);
    expect(quote.totalCents).toBe(4565);
    expect(quote.currency).toBe("USD");
    expect(quote.subtotalCents + quote.shippingCents + quote.taxCents).toBe(
      quote.totalCents,
    );
    for (const amount of [
      quote.subtotalCents,
      quote.shippingCents,
      quote.taxCents,
      quote.totalCents,
      ...quote.items.flatMap((item) => [
        item.unitPriceCents,
        item.lineTotalCents,
      ]),
    ]) {
      expect(Number.isInteger(amount)).toBe(true);
    }
  });

  it("never writes to the database", async () => {
    findMany.mockResolvedValue([variant()] as never);

    await quoteCart([{ variantId: "variant-1", quantity: 1 }]);

    expect(createOrder).not.toHaveBeenCalled();
    expect(createVariant).not.toHaveBeenCalled();
    expect(updateVariant).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });
});
