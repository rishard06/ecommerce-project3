import { getProduct } from "./products";

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

/**
 * Validates cart item prices against DummyJSON API
 * Fetches authoritative prices server-side to prevent client price manipulation
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

  try {
    // Batch fetch all product prices from DummyJSON API
    const productPromises = items.map((item) =>
      getProduct(item.id.toString()).catch((err) => ({
        error: true,
        id: item.id,
        message: err.message,
      }))
    );

    const products = await Promise.all(productPromises);

    // Check for failed product fetches
    const failedProducts = products.filter((p: any) => p.error);
    if (failedProducts.length > 0) {
      const failedIds = failedProducts.map((p: any) => p.id).join(", ");
      return {
        success: false,
        error: `Could not fetch prices for product IDs: ${failedIds}`,
      };
    }

    // Build validated items with authoritative prices
    const validatedItems: ValidatedCartItem[] = items.map((item) => {
      const product = products.find((p: any) => p.id === item.id);

      if (!product || (product as any).error) {
        throw new Error(`Product ${item.id} not found`);
      }

      return {
        id: item.id,
        title: (product as any).title,
        price: (product as any).price,
        quantity: item.quantity,
      };
    });

    // Calculate totals server-side
    const subtotal = validatedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const tax = subtotal * 0.015; // 1.5% tax rate
    const total = subtotal + tax;

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
