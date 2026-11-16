import { prisma } from "@/lib/prisma";

/**
 * Task 16: read-only invoice data builder.
 *
 * Every money field comes ONLY from the immutable `Order` + `OrderItem`
 * snapshot rows captured at order creation. This module never reads
 * `ProductVariant` live prices, never writes, and never logs audit rows.
 * A missing id returns `null`, matching `getOrderForAdmin` reads.
 */

/** One immutable invoice line, mapped 1:1 from the `OrderItem` snapshot. */
export interface InvoiceLine {
  id: string;
  variantId: string | null;
  productSlug: string;
  sku: string;
  title: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

/**
 * Invoice data for Task 17 (print-friendly invoice route). All money is
 * integer cents; formatting happens at the render boundary via `formatCents`.
 */
export interface InvoiceData {
  orderId: string;
  createdAt: Date;
  currency: string;
  couponCode: string | null;
  lines: InvoiceLine[];
  shipping: InvoiceShipping;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
}

/** Scalar shipping snapshot, mapped 1:1 from the `Order` snapshot row. */
export interface InvoiceShipping {
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

/**
 * Loads one order's invoice snapshot. Returns `null` when the order does
 * not exist. Read-only: a single `findUnique` with the items snapshot.
 */
export async function getInvoiceData(
  orderId: string,
): Promise<InvoiceData | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      createdAt: true,
      currency: true,
      subtotalCents: true,
      discountCents: true,
      couponCode: true,
      shippingCents: true,
      taxCents: true,
      totalCents: true,
      shippingFullName: true,
      shippingLine1: true,
      shippingLine2: true,
      shippingCity: true,
      shippingRegion: true,
      shippingPostalCode: true,
      shippingCountry: true,
      items: {
        select: {
          id: true,
          variantId: true,
          productSlug: true,
          sku: true,
          title: true,
          unitPriceCents: true,
          quantity: true,
          lineTotalCents: true,
        },
      },
    },
  });

  if (!order) {
    return null;
  }

  return {
    orderId: order.id,
    createdAt: order.createdAt,
    currency: order.currency,
    couponCode: order.couponCode,
    lines: order.items.map((item) => ({
      id: item.id,
      variantId: item.variantId,
      productSlug: item.productSlug,
      sku: item.sku,
      title: item.title,
      unitPriceCents: item.unitPriceCents,
      quantity: item.quantity,
      lineTotalCents: item.lineTotalCents,
    })),
    shipping: {
      fullName: order.shippingFullName,
      line1: order.shippingLine1,
      line2: order.shippingLine2,
      city: order.shippingCity,
      region: order.shippingRegion,
      postalCode: order.shippingPostalCode,
      country: order.shippingCountry,
    },
    subtotalCents: order.subtotalCents,
    discountCents: order.discountCents,
    shippingCents: order.shippingCents,
    taxCents: order.taxCents,
    totalCents: order.totalCents,
  };
}
