import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const totalAmount = items.reduce(
      (acc: number, item: any) => acc + item.price * item.quantity,
      0
    );

    const order = await prisma.order.create({
      data: {
        totalAmount,
        items: {
          create: items.map((item: any) => ({
            productId: typeof item.id === 'string' ? parseInt(item.id) : item.id,
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
  } catch (error: any) {
    console.error("ORDER_CREATION_ERROR", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
