import { prisma } from "@/lib/prisma";
import { getOrderTotals } from "@/lib/pricing";

export interface CartItemInput {
  id: number;
  quantity: number;
}

export interface ValidatedCartItem {
  id: number;
  title: string;
  price: number;
  quantity: number;
}

export interface PriceValidationResult {
  success: boolean;
  error?: string;
  validatedItems?: ValidatedCartItem[];
  subtotal?: number;
  tax?: number;
  total?: number;
}

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 99;

/**
 * Validates cart item prices against the database.
 *
 * Prices and stock are read server-side from the Product table, so a client
 * can only ever submit `{ id, quantity }` and never influence the total.
 */
export async function validateCartPrices(
  items: CartItemInput[]
): Promise<PriceValidationResult> {
  if (!items || items.length === 0) {
    return {
      success: false,
      error: "Cart is empty",
    };
  }

  // Validate quantities before touching the database.
  for (const item of items) {
    if (
      !Number.isInteger(item.quantity) ||
      item.quantity < MIN_QUANTITY ||
      item.quantity > MAX_QUANTITY
    ) {
      return {
        success: false,
        error: `Invalid quantity for product ID ${item.id}: must be a whole number between ${MIN_QUANTITY} and ${MAX_QUANTITY}`,
      };
    }
  }

  try {
    const ids = [...new Set(items.map((item) => item.id))];

    // Batch fetch authoritative product data in a single query.
    const productDelegate = (prisma as unknown as { product?: {
      findMany: (args: unknown) => Promise<Array<{ id: number; title: string; price: number; stock: number }>>;
    } }).product;
    if (!productDelegate) {
      return {
        success: false,
        error: "Product catalog is missing. Run: npx prisma migrate dev --name demo_expansion && npx prisma generate && npx prisma db seed",
      };
    }
    const products = await productDelegate.findMany({
      where: { id: { in: ids } },
      select: { id: true, title: true, price: true, stock: true },
    });

    const productsById = new Map(products.map((product) => [product.id, product]));

    const missingIds = ids.filter((id) => !productsById.has(id));
    if (missingIds.length > 0) {
      return {
        success: false,
        error: `Products not found: ${missingIds.join(", ")}`,
      };
    }

    const validatedItems: ValidatedCartItem[] = [];

    // Aggregate duplicate cart lines so stock is checked against the total
    // requested quantity, not each line independently.
    const requestedQuantities = new Map<number, number>();
    for (const item of items) {
      requestedQuantities.set(
        item.id,
        (requestedQuantities.get(item.id) ?? 0) + item.quantity
      );
    }

    for (const [id, quantity] of requestedQuantities) {
      const product = productsById.get(id);
      if (!product) {
        return {
          success: false,
          error: `Products not found: ${id}`,
        };
      }

      if (quantity > product.stock) {
        return {
          success: false,
          error: `Insufficient stock for product ID ${id} ("${product.title}"): requested ${quantity}, available ${product.stock}`,
        };
      }
    }

    for (const item of items) {
      const product = productsById.get(item.id);

      if (!product) {
        return {
          success: false,
          error: `Products not found: ${item.id}`,
        };
      }

      validatedItems.push({
        id: product.id,
        title: product.title,
        price: product.price,
        quantity: item.quantity,
      });
    }

    const subtotal = validatedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const { tax, total } = getOrderTotals(subtotal, "standard");

    return {
      success: true,
      validatedItems,
      subtotal,
      tax,
      total,
    };
  } catch (error) {
    console.error("Price validation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to validate prices",
    };
  }
}
