import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { validateCartPrices, type CartItemInput } from "@/lib/price-validation";
import { requireUser, UnauthorizedError, ForbiddenError } from "@/features/identity/server/guards";

export async function POST(req: Request) {
  try {
    // SECURITY: ownership comes from the session, never from the request body.
    const user = await requireUser();

    const body = await req.json();
    const { items } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Convert items to CartItemInput format (only id and quantity)
    const cartItems: CartItemInput[] = items.map((item: { id: number | string; quantity: number }) => ({
      id: typeof item.id === 'string' ? parseInt(item.id) : item.id,
      quantity: item.quantity
    }));

    // Validate prices server-side (SECURITY: Prevent price manipulation)
    const priceValidation = await validateCartPrices(cartItems);

    if (!priceValidation.success) {
      return NextResponse.json(
        { error: priceValidation.error || "Failed to validate product prices" },
        { status: 400 }
      );
    }

    // Create order for the authenticated user with validated prices and totals
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        totalAmount: priceValidation.total!,
        items: {
          create: priceValidation.validatedItems!.map((item) => ({
            productId: item.id,
            title: item.title,
            price: item.price,
            quantity: item.quantity
          }))
        }
      },
      include: {
        items: true
      }
    });

    return NextResponse.json(order);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("ORDER_CREATION_ERROR", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
