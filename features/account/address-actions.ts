"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/features/identity/server/guards";
import { addressMutationSchema, addressInputSchema } from "./schemas";
import type { AddressRow } from "./types";

function addressData(
  parsed: ReturnType<typeof addressInputSchema.parse>,
): Omit<AddressRow, "id" | "userId" | "isDefault"> {
  return {
    fullName: parsed.fullName,
    line1: parsed.line1,
    line2: parsed.line2 && parsed.line2.length > 0 ? parsed.line2 : null,
    city: parsed.city,
    region: parsed.region,
    postalCode: parsed.postalCode,
    country: parsed.country,
  };
}

/**
 * Saves an address for the signed-in user. Identity comes only from the
 * session; a caller-supplied `userId` is stripped by the schema. When the
 * address is the new default, unsetting the previous default and creating the
 * row happen in one transaction.
 */
export async function saveAddress(data: unknown): Promise<AddressRow> {
  const user = await requireUser();
  const parsed = addressMutationSchema.parse(data);

  return prisma.$transaction(async (tx) => {
    if (parsed.isDefault) {
      await tx.address.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
    }

    return tx.address.create({
      data: {
        userId: user.id,
        ...addressData(parsed),
        isDefault: parsed.isDefault ?? false,
      },
    });
  });
}

/**
 * Lists only the signed-in user's addresses. The caller id is never accepted,
 * so another user's address book cannot be requested.
 */
export async function listAddresses(): Promise<AddressRow[]> {
  const user = await requireUser();

  return prisma.address.findMany({
    where: { userId: user.id },
    orderBy: { isDefault: "desc" },
  });
}

/**
 * Updates one of the signed-in user's addresses. The ownership predicate is
 * part of both the lookup and the update, so another user's row resolves to
 * "Address not found." without being read or modified.
 */
export async function updateAddress(
  addressId: string,
  data: unknown,
): Promise<AddressRow> {
  const user = await requireUser();
  const parsed = addressMutationSchema.parse(data);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.address.findFirst({
      where: { id: addressId, userId: user.id },
      select: { id: true },
    });

    if (!existing) {
      throw new Error("Address not found.");
    }

    if (parsed.isDefault) {
      await tx.address.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
    }

    return tx.address.update({
      where: { id: addressId, userId: user.id },
      data: {
        ...addressData(parsed),
        ...(parsed.isDefault === undefined
          ? {}
          : { isDefault: parsed.isDefault }),
      },
    });
  });
}

/**
 * Marks one owned address as the default. Unsetting every default and setting
 * the target happen in one transaction, so a missing target rolls back the
 * unset step instead of leaving the user without a default.
 */
export async function setDefaultAddress(addressId: string) {
  const user = await requireUser();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.address.findFirst({
      where: { id: addressId, userId: user.id },
      select: { id: true },
    });

    if (!existing) {
      throw new Error("Address not found.");
    }

    await tx.address.updateMany({
      where: { userId: user.id },
      data: { isDefault: false },
    });
    await tx.address.update({
      where: { id: addressId, userId: user.id },
      data: { isDefault: true },
    });

    return { success: true as const };
  });
}

/**
 * Deletes one owned address. Deleting the default leaves no default address;
 * that behavior is pinned in `server/addresses.test.ts`. Orders keep their own
 * scalar shipping snapshot, so deleting an address never mutates an order.
 */
export async function deleteAddress(addressId: string) {
  const user = await requireUser();

  await prisma.address.deleteMany({
    where: { id: addressId, userId: user.id },
  });

  return { success: true as const };
}
