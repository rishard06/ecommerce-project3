import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { CartQuoteError, quoteCart } from "@/features/cart/server/quote-cart";
import { requireUser, UnauthorizedError, ForbiddenError } from "@/features/identity/server/guards";

// Mirrors the checkout action's shipping schema. The route is a legacy entry
// point; the storefront now submits through the server action.
const shippingSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City is required"),
  postalCode: z.string().min(5, "Postal code is required"),
  country: z.string().min(2, "Country is required"),
});

export async function POST(req: Request) {
  try {
    // SECURITY: ownership comes from the session, never from the request body.
    const user = await requireUser();

    const body = await req.json();
    const { items, shipping } = body ?? {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const validShipping = shippingSchema.parse(shipping ?? {});

    // SECURITY: prices come only from the owned catalog, never the request.
    const quote = await quoteCart(items);

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        status: "PENDING",
        currency: quote.currency,
        subtotalCents: quote.subtotalCents,
        shippingCents: quote.shippingCents,
        taxCents: quote.taxCents,
        totalCents: quote.totalCents,
        shippingFullName: `${validShipping.firstName} ${validShipping.lastName}`,
        shippingLine1: validShipping.address,
        shippingCity: validShipping.city,
        shippingRegion: "",
        shippingPostalCode: validShipping.postalCode,
        shippingCountry: validShipping.country,
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
      include: {
        items: true,
      },
    });

    return NextResponse.json(
      {
        orderId: order.id,
        subtotalCents: quote.subtotalCents,
        shippingCents: quote.shippingCents,
        taxCents: quote.taxCents,
        totalCents: quote.totalCents,
        currency: quote.currency,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (error instanceof CartQuoteError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }
    console.error("ORDER_CREATION_ERROR", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
