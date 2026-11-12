import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { validateCartPrices } from "@/lib/price-validation";
import { getOrderTotals } from "@/lib/pricing";

const orderRequestSchema = z.object({
  items: z.array(z.object({ id: z.number(), quantity: z.number().int().min(1).max(99) })).min(1),
  shipping: z
    .object({
      firstName: z.string().min(2),
      lastName: z.string().min(2),
      address: z.string().min(5),
      city: z.string().min(2),
      postalCode: z.string().min(5),
      country: z.string().min(2),
    })
    .optional(),
  method: z.enum(["standard", "express", "pickup"]).optional(),
  coupon: z.string().optional(),
  idempotencyKey: z.string().min(8).max(64).optional(),
});

const rateLimit = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  // Drop expired entries so the map cannot grow forever.
  if (rateLimit.size > 500) rateLimit.clear();
  for (const [key, entry] of rateLimit) {
    if (entry.resetAt <= now) rateLimit.delete(key);
  }
  const entry = rateLimit.get(ip);
  if (!entry) {
    rateLimit.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 10;
}

export async function POST(req: Request) {
  try {
    const ip = (await headers()).get("x-forwarded-for") ?? "local";
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const parsed = orderRequestSchema.safeParse({
      ...body,
      items: (body.items ?? []).map((item: { id: string | number; quantity: number }) => ({
        id: typeof item.id === "string" ? parseInt(item.id) : item.id,
        quantity: item.quantity,
      })),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const priceValidation = await validateCartPrices(parsed.data.items);
    if (!priceValidation.success) {
      return NextResponse.json({ error: priceValidation.error }, { status: 400 });
    }

    let userId: string | null = null;
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      userId = (session?.user?.id as string | undefined) ?? null;
    } catch {
      userId = null;
    }

    const method = parsed.data.method ?? "standard";
    const coupon = parsed.data.coupon?.toUpperCase() || undefined;
    const totals = getOrderTotals(priceValidation.subtotal!, method, coupon);

    if (parsed.data.idempotencyKey) {
      const existing = await prisma.order.findFirst({
        where: { idempotencyKey: parsed.data.idempotencyKey },
        include: { items: true },
      });
      if (existing) return NextResponse.json(existing);
    }

    let order;
    try {
      order = await prisma.order.create({
        data: {
          userId: userId ?? undefined,
          status: "PAID",
          subtotal: totals.subtotal,
          shipping: totals.shipping,
          tax: totals.tax,
          totalAmount: totals.total,
          shippingAddress: (parsed.data.shipping ?? {}) as object,
          paymentMethod: "card_test",
          coupon: coupon ?? null,
          idempotencyKey: parsed.data.idempotencyKey ?? null,
          items: {
            create: priceValidation.validatedItems!.map((item) => ({
              productId: item.id,
              title: item.title,
              price: item.price,
              quantity: item.quantity,
            })),
          },
        },
        include: { items: true },
      });
    } catch (createError) {
      // Parallel request won the race — return the winner, not a duplicate.
      if (
        parsed.data.idempotencyKey &&
        typeof createError === "object" &&
        createError !== null &&
        (createError as { code?: string }).code === "P2002"
      ) {
        const existing = await prisma.order.findFirst({
          where: { idempotencyKey: parsed.data.idempotencyKey },
          include: { items: true },
        });
        if (existing) return NextResponse.json(existing);
      }
      throw createError;
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("ORDER_CREATION_ERROR", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("mine") !== "1") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const orders = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });
    return NextResponse.json(orders);
  } catch (error) {
    console.error("ORDERS_FETCH_ERROR", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
