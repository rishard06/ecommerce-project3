"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ShippingAddress, PaymentMethod } from "./types";
import {
  CartQuoteError,
  quoteCart,
} from "@/features/cart/server/quote-cart";
import type { CartItemInput } from "@/features/cart/types";
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

    // 3. Price the cart from the database. The browser only supplies variant
    //    ids and quantities; any smuggled price/title/userId is stripped.
    const quote = await quoteCart(items);

    // 4. Create the order and its immutable line snapshots. Reservation and
    //    payment orchestration are added by the checkout transaction task.
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        status: "PENDING",
        currency: quote.currency,
        subtotalCents: quote.subtotalCents,
        shippingCents: quote.shippingCents,
        taxCents: quote.taxCents,
        totalCents: quote.totalCents,
        shippingFullName: `${validatedShipping.firstName} ${validatedShipping.lastName}`,
        shippingLine1: validatedShipping.address,
        shippingCity: validatedShipping.city,
        // The current checkout form does not collect a state/region yet.
        shippingRegion: "",
        shippingPostalCode: validatedShipping.postalCode,
        shippingCountry: validatedShipping.country,
        items: {
          create: quote.items.map((item) => ({
            variantId: item.variantId,
            productSlug: item.productSlug,
            sku: item.sku,
            title: item.title,
            unitPriceCents: item.unitPriceCents,
            quantity: item.quantity,
            lineTotalCents: item.lineTotalCents,
          })),
        },
      },
    });

    return {
      success: true,
      orderId: order.id,
      subtotalCents: quote.subtotalCents,
      taxCents: quote.taxCents,
      totalCents: quote.totalCents,
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: "Unauthorized" };
    }
    if (error instanceof CartQuoteError) {
      return { success: false, error: error.message };
    }
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}
