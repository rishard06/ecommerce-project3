import { prisma } from "@/lib/prisma";
import { getOrderTotals } from "@/lib/pricing";
import { cartItemsSchema } from "../schemas";
import type { CartItemInput, CartQuote, CartQuoteItem } from "../types";

/**
 * Rejection raised when a cart is syntactically valid but cannot be quoted
 * (unknown/inactive variant, merged quantity too large, corrupt DB price).
 * Callers map this to HTTP 400 / a user-facing validation message.
 */
export class CartQuoteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CartQuoteError";
  }
}

const MAX_QUANTITY_PER_LINE = 10;
const MAX_CART_LINES = 50;

/**
 * The narrow slice of the Prisma client the quote needs. Both the root client
 * and a `Prisma.TransactionClient` satisfy it, so checkout can price a cart
 * using the same transaction that reserves stock.
 */
export type CartQuoteClient = Pick<typeof prisma, "productVariant">;

/**
 * Prices a cart exclusively from the owned PostgreSQL catalog.
 *
 * The browser supplies only `{ variantId, quantity }`; every amount returned
 * comes from `ProductVariant.priceCents`. Duplicate variant lines are merged
 * before the per-line cap is re-checked. No writes occur here — stock
 * reservation belongs to the transactional order-creation service.
 */
export async function quoteCart(
  items: CartItemInput[],
  client: CartQuoteClient = prisma,
): Promise<CartQuote> {
  const parsed = cartItemsSchema.parse(items);

  // Merge duplicates while preserving first-appearance order. The schema has
  // already stripped any browser-supplied price/title fields.
  const quantities = new Map<string, number>();
  for (const item of parsed) {
    quantities.set(
      item.variantId,
      (quantities.get(item.variantId) ?? 0) + item.quantity,
    );
  }

  if (quantities.size > MAX_CART_LINES) {
    throw new CartQuoteError(
      `Cart cannot contain more than ${MAX_CART_LINES} items`,
    );
  }

  for (const [variantId, quantity] of quantities) {
    if (quantity > MAX_QUANTITY_PER_LINE) {
      throw new CartQuoteError(
        `Quantity for variant ${variantId} exceeds the maximum of ${MAX_QUANTITY_PER_LINE}`,
      );
    }
  }

  const variantIds = [...quantities.keys()];
  const variants = await client.productVariant.findMany({
    where: { id: { in: variantIds } },
    include: { product: { select: { slug: true, title: true, status: true } } },
  });

  const variantsById = new Map(variants.map((variant) => [variant.id, variant]));

  const quoteItems: CartQuoteItem[] = [];
  for (const variantId of variantIds) {
    const variant = variantsById.get(variantId);
    const product = variant?.product;

    if (!variant || !product || product.status !== "ACTIVE") {
      throw new CartQuoteError(`Variant ${variantId} is not available`);
    }

    if (
      !Number.isInteger(variant.priceCents) ||
      variant.priceCents < 0
    ) {
      throw new CartQuoteError(`Variant ${variantId} has an invalid price`);
    }

    const quantity = quantities.get(variantId) ?? 0;
    const lineTotalCents = variant.priceCents * quantity;

    if (!Number.isSafeInteger(lineTotalCents)) {
      throw new CartQuoteError(`Variant ${variantId} has an invalid price`);
    }

    quoteItems.push({
      variantId: variant.id,
      productSlug: product.slug,
      title: product.title,
      sku: variant.sku,
      unitPriceCents: variant.priceCents,
      quantity,
      lineTotalCents,
    });
  }

  const subtotalCents = quoteItems.reduce(
    (sum, item) => sum + item.lineTotalCents,
    0,
  );
  const totals = getOrderTotals(subtotalCents);

  return {
    items: quoteItems,
    subtotalCents: totals.subtotalCents,
    shippingCents: totals.shippingCents,
    taxCents: totals.taxCents,
    totalCents: totals.totalCents,
    currency: "USD",
  };
}
