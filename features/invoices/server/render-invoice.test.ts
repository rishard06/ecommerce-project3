import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Task 16 RED: invoice data comes ONLY from the Order + OrderItem snapshot.
 *
 * This module does not exist yet, so this suite must FAIL on import until
 * `render-invoice.ts` implements `getInvoiceData`.
 */

const mocks = vi.hoisted(() => ({
  orderFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: { findUnique: mocks.orderFindUnique },
  },
}));

import { getInvoiceData } from "./render-invoice";

const SNAPSHOT_ORDER = {
  id: "order-1",
  createdAt: new Date("2026-02-01T10:00:00.000Z"),
  currency: "USD",
  subtotalCents: 3998,
  discountCents: 500,
  couponCode: "SAVE10",
  shippingCents: 500,
  taxCents: 288,
  totalCents: 4286,
  shippingFullName: "Jane Doe",
  shippingLine1: "123 Main Street",
  shippingLine2: "Apt 4",
  shippingCity: "Springfield",
  shippingRegion: "IL",
  shippingPostalCode: "62701",
  shippingCountry: "US",
  items: [
    {
      id: "item-1",
      variantId: "variant-1",
      productSlug: "product-slug",
      sku: "sku-1",
      title: "Snapshot product",
      unitPriceCents: 1999,
      quantity: 2,
      lineTotalCents: 3998,
    },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("getInvoiceData (Order snapshot only)", () => {
  it("returns lines + money totals exactly as stored on the snapshot", async () => {
    mocks.orderFindUnique.mockResolvedValue(SNAPSHOT_ORDER);

    const invoice = await getInvoiceData("order-1");

    expect(invoice).toMatchObject({
      orderId: "order-1",
      currency: "USD",
      couponCode: "SAVE10",
      subtotalCents: 3998,
      discountCents: 500,
      shippingCents: 500,
      taxCents: 288,
      totalCents: 4286,
      shipping: {
        fullName: "Jane Doe",
        line1: "123 Main Street",
        line2: "Apt 4",
        city: "Springfield",
        region: "IL",
        postalCode: "62701",
        country: "US",
      },
    });
    expect(invoice?.createdAt).toEqual(new Date("2026-02-01T10:00:00.000Z"));
    expect(invoice?.lines).toHaveLength(1);
    expect(invoice?.lines[0]).toMatchObject({
      productSlug: "product-slug",
      sku: "sku-1",
      title: "Snapshot product",
      unitPriceCents: 1999,
      quantity: 2,
      lineTotalCents: 3998,
    });
    // Integer cents end-to-end, never floats.
    for (const cents of [
      invoice?.subtotalCents,
      invoice?.discountCents,
      invoice?.shippingCents,
      invoice?.taxCents,
      invoice?.totalCents,
      invoice?.lines[0]?.unitPriceCents,
      invoice?.lines[0]?.lineTotalCents,
    ]) {
      expect(Number.isInteger(cents)).toBe(true);
    }
  });

  it("ignores live ProductVariant prices: snapshot wins after a price change", async () => {
    // The merchant reprices the live variant AFTER the order was placed.
    // The invoice must still show the stored snapshot (1999), never the
    // live price. The prisma mock exposes ONLY `order.findUnique` — any
    // `productVariant` read inside the implementation throws, failing loudly.
    mocks.orderFindUnique.mockResolvedValue({
      ...SNAPSHOT_ORDER,
      items: [
        {
          ...SNAPSHOT_ORDER.items[0],
          unitPriceCents: 1999,
          lineTotalCents: 3998,
        },
      ],
    });

    const invoice = await getInvoiceData("order-1");

    expect(mocks.orderFindUnique).toHaveBeenCalledTimes(1);
    expect(mocks.orderFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "order-1" } }),
    );
    expect(invoice?.lines[0]?.unitPriceCents).toBe(1999);
    expect(invoice?.lines[0]?.lineTotalCents).toBe(3998);
    expect(invoice?.subtotalCents).toBe(3998);
    expect(invoice?.totalCents).toBe(4286);
  });

  it("returns null for a missing order (matches getOrderForAdmin reads)", async () => {
    mocks.orderFindUnique.mockResolvedValue(null);

    await expect(getInvoiceData("missing-order")).resolves.toBeNull();
  });

  it("is read-only: a single order lookup, no writes, no audit", async () => {
    mocks.orderFindUnique.mockResolvedValue(SNAPSHOT_ORDER);

    await getInvoiceData("order-1");

    // The only prisma call is the snapshot read. There is no $transaction,
    // create, update, or delete on the mocked client at all.
    expect(mocks.orderFindUnique).toHaveBeenCalledTimes(1);
  });
});
