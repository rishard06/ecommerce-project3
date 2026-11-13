"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { AddressRow } from "./types";

const addressInputSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  address: z.string().trim().min(3, "Street address is required").max(200),
  city: z.string().trim().min(1, "City is required").max(120),
  postalCode: z.string().trim().min(1, "Postal code is required").max(30),
  country: z.string().trim().min(1, "Country is required").max(120),
  isDefault: z.boolean().optional(),
});

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new Error("Please sign in to manage your addresses.");
  }
  return session.user.id;
}

export async function saveAddress(data: unknown): Promise<AddressRow> {
  const userId = await requireUserId();
  const parsed = addressInputSchema.parse(data);

  if (parsed.isDefault) {
    await prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false },
    });
  }

  return prisma.address.create({
    data: {
      userId,
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      address: parsed.address,
      city: parsed.city,
      postalCode: parsed.postalCode,
      country: parsed.country,
      isDefault: parsed.isDefault ?? false,
    },
  });
}

export async function deleteAddress(addressId: string) {
  const userId = await requireUserId();
  await prisma.address.deleteMany({ where: { id: addressId, userId } });
  return { success: true as const };
}

export async function setDefaultAddress(addressId: string) {
  const userId = await requireUserId();
  const existing = await prisma.address.findFirst({
    where: { id: addressId, userId },
  });
  if (!existing) {
    throw new Error("Address not found.");
  }

  await prisma.address.updateMany({
    where: { userId },
    data: { isDefault: false },
  });
  await prisma.address.update({
    where: { id: addressId },
    data: { isDefault: true },
  });

  return { success: true as const };
}

export async function listAddresses(userId: string): Promise<AddressRow[]> {
  return prisma.address.findMany({
    where: { userId },
    orderBy: { isDefault: "desc" },
  });
}
