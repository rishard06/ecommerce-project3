"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ShippingAddress, PaymentMethod } from "./types";
import { validateCartPrices, CartItemInput } from "@/lib/price-validation";
import { requireUser, UnauthorizedError } from "@/features/identity/server/guards";

const shippingSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City is required"),
  postalCode: z.string().min(5, "Postal code is required"),
  country: z.string().min(2, "Country is required"),
});

export async function createOrderAction(
  shippingInfo: ShippingAddress,
  paymentMethod: PaymentMethod,
  items: CartItemInput[]
) {
  try {
    // 1. Resolve the authenticated user (SECURITY: ownership comes from the
    //    session, never from caller-supplied arguments).
    const user = await requireUser();

    // 2. Validate Shipping Info
    const validatedShipping = shippingSchema.parse(shippingInfo);

    // 3. Validate Prices Server-Side (SECURITY: Prevent price manipulation)
    const priceValidation = await validateCartPrices(items);

    if (!priceValidation.success) {
      return {
        success: false,
        error: priceValidation.error || "Failed to validate product prices"
      };
    }

    // 4. Simulate Payment Delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 5. Create Order in Prisma with validated prices, owned by the session user
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        totalAmount: priceValidation.total!,
        items: {
          create: priceValidation.validatedItems!.map((item) => ({
            productId: item.id,
            title: item.title,
            price: item.price,
            quantity: item.quantity,
          })),
        },
      },
    });

    return {
      success: true,
      orderId: order.id,
      total: priceValidation.total,
      subtotal: priceValidation.subtotal,
      tax: priceValidation.tax
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: "Unauthorized" };
    }
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}
