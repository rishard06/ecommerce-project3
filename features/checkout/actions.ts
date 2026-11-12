"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { z } from "zod";
import type { ShippingAddress } from "./types";
import { validateCartPrices, type CartItemInput } from "@/lib/price-validation";
import { getOrderTotals, type ShippingMethod } from "@/lib/pricing";

const shippingSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City is required"),
  postalCode: z.string().min(5, "Postal code is required"),
  country: z.string().min(2, "Country is required"),
});

const methodSchema = z.enum(["standard", "express", "pickup"]).default("standard");

const createOrderInputSchema = z.object({
  addressId: z.string().optional(),
  shipping: shippingSchema,
  method: methodSchema.optional(),
  payment: z
    .object({ cardLast4: z.string().optional(), method: z.string().optional() })
    .optional(),
  coupon: z.string().optional(),
  idempotencyKey: z.string().min(8).max(64).optional(),
  items: z.array(
    z.object({ id: z.number(), quantity: z.number().int().min(1).max(99) })
  ),
});

export interface CreateOrderInput {
  addressId?: string;
  shipping: ShippingAddress;
  method?: ShippingMethod | string;
  payment?: { cardLast4?: string; method?: string };
  coupon?: string;
  idempotencyKey?: string;
  items: CartItemInput[];
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002"
  );
}

async function getSessionUserId(): Promise<string | null> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    return (session?.user?.id as string | undefined) ?? null;
  } catch {
    return null;
  }
}

async function createOrderNew(input: CreateOrderInput) {
  const parsed = createOrderInputSchema.safeParse({
    ...input,
    method: (input.method as string | undefined) ?? "standard",
  });
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message };
  }
  const { shipping, items } = parsed.data;
  const method = (parsed.data.method ?? "standard") as ShippingMethod;
  const coupon = parsed.data.coupon?.toUpperCase() || undefined;

  const priceValidation = await validateCartPrices(items);
  if (!priceValidation.success) {
    return { success: false as const, error: priceValidation.error || "Failed to validate product prices" };
  }

  // Simulated payment delay (test mode, no charge)
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const totals = getOrderTotals(priceValidation.subtotal!, method, coupon);
  const userId = await getSessionUserId();

  // Idempotency: a retry or double-click with the same key returns the first order.
  if (parsed.data.idempotencyKey) {
    try {
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey: parsed.data.idempotencyKey },
      });
      if (existing) {
        return {
          success: true as const,
          orderId: existing.id,
          total: existing.totalAmount,
          subtotal: totals.subtotal,
          tax: totals.tax,
        };
      }
    } catch {
      // Stale client or missing column — fall through to create.
    }
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
        shippingAddress: shipping as object,
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
    });
  } catch (error) {
    // A parallel request won the race — return the winner instead of a duplicate.
    if (parsed.data.idempotencyKey && isUniqueViolation(error)) {
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey: parsed.data.idempotencyKey },
      });
      if (existing) {
        return {
          success: true as const,
          orderId: existing.id,
          total: existing.totalAmount,
          subtotal: totals.subtotal,
          tax: totals.tax,
        };
      }
    }
    throw error;
  }

  return {
    success: true as const,
    orderId: order.id,
    total: totals.total,
    subtotal: totals.subtotal,
    tax: totals.tax,
  };
}

// Supports both new object signature and legacy (shippingInfo, paymentMethod, items).
export async function createOrderAction(
  inputOrShipping: CreateOrderInput | ShippingAddress,
  paymentMethod?: string,
  items?: CartItemInput[]
) {
  try {
    if (items !== undefined || typeof paymentMethod === "string") {
      const shippingInfo = inputOrShipping as ShippingAddress;
      const cartItems = (items ?? []) as CartItemInput[];
      return createOrderNew({
        shipping: shippingInfo,
        method: "standard",
        payment: { method: paymentMethod },
        items: cartItems,
      });
    }
    return createOrderNew(inputOrShipping as CreateOrderInput);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false as const, error: error.issues[0].message };
    }
    return { success: false as const, error: "An unexpected error occurred. Please try again." };
  }
}

export type OrderWithItems = Prisma.OrderGetPayload<{
  include: { items: true };
}>;

export async function getMyOrders(userId: string): Promise<OrderWithItems[]> {
  try {
    return await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });
  } catch (error) {
    console.error("getMyOrders unavailable — run prisma migrate + generate:", error);
    return [];
  }
}

export async function getOrderDetail(userId: string, orderId: string): Promise<OrderWithItems | null> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return null;
    if ((order as { userId?: string | null }).userId && (order as { userId?: string | null }).userId !== userId) return null;
    return order;
  } catch (error) {
    console.error("getOrderDetail unavailable — run prisma migrate + generate:", error);
    return null;
  }
}

const addressInputSchema = shippingSchema.extend({
  isDefault: z.boolean().optional(),
});

export interface AddressRow {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

interface AddressDelegate {
  findMany: (args: unknown) => Promise<AddressRow[]>;
  findFirst: (args: unknown) => Promise<AddressRow | null>;
  create: (args: unknown) => Promise<AddressRow>;
  update: (args: unknown) => Promise<AddressRow>;
  updateMany: (args: unknown) => Promise<unknown>;
  deleteMany: (args: unknown) => Promise<unknown>;
}

function getAddressDelegate(): AddressDelegate | null {
  const delegate = (prisma as unknown as { address?: AddressDelegate }).address;
  if (!delegate) {
    console.error("prisma.address is undefined — generated client is stale. Run: npx prisma migrate dev --name demo_expansion && npx prisma generate");
    return null;
  }
  return delegate;
}

export async function saveAddress(userId: string, data: unknown) {
  const addressDelegate = getAddressDelegate();
  if (!addressDelegate) {
    throw new Error("Address table is missing. Run: npx prisma migrate dev --name demo_expansion && npx prisma generate");
  }
  const parsed = addressInputSchema.parse(data);
  if (parsed.isDefault) {
    await addressDelegate.updateMany({ where: { userId }, data: { isDefault: false } });
  }
  return addressDelegate.create({
    data: { userId, ...parsed, isDefault: parsed.isDefault ?? false },
  });
}

export async function deleteAddress(userId: string, addressId: string) {
  const addressDelegate = getAddressDelegate();
  if (!addressDelegate) {
    throw new Error("Address table is missing. Run: npx prisma migrate dev --name demo_expansion && npx prisma generate");
  }
  await addressDelegate.deleteMany({ where: { id: addressId, userId } });
  return { success: true as const };
}

export async function setDefaultAddress(userId: string, addressId: string) {
  const addressDelegate = getAddressDelegate();
  if (!addressDelegate) {
    throw new Error("Address table is missing. Run: npx prisma migrate dev --name demo_expansion && npx prisma generate");
  }
  const existing = await addressDelegate.findFirst({ where: { id: addressId, userId } });
  if (!existing) {
    throw new Error("Address not found.");
  }
  await addressDelegate.updateMany({ where: { userId }, data: { isDefault: false } });
  await addressDelegate.update({ where: { id: addressId }, data: { isDefault: true } });
  return { success: true as const };
}

export async function listAddresses(userId: string): Promise<AddressRow[]> {
  const addressDelegate = getAddressDelegate();
  if (!addressDelegate) return [];
  return addressDelegate.findMany({ where: { userId }, orderBy: { isDefault: "desc" } });
}
