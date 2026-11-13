import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@/app/generated/prisma";

/**
 * Session identity is the only accepted caller identity. The actions import
 * `requireUser` from this module, so every test controls the "session" here
 * rather than passing a user id (the merge defect this suite pins).
 */
vi.mock("@/features/identity/server/guards", () => {
  class MockUnauthorizedError extends Error {
    constructor() {
      super("Unauthorized");
      this.name = "UnauthorizedError";
    }
  }

  return {
    requireUser: vi.fn(),
    UnauthorizedError: MockUnauthorizedError,
  };
});

/**
 * Loads the disposable test database URL. Tests must never fall back to the
 * application database: if `DATABASE_URL_TEST` is missing or points at the
 * same server/database as `DATABASE_URL`, the suite fails before any query.
 */
function loadTestDatabaseUrl(): string {
  try {
    process.loadEnvFile?.(".env");
  } catch {
    // `.env` is optional; the test URL may be provided by the shell.
  }

  const testUrl = process.env.DATABASE_URL_TEST;
  if (!testUrl) {
    throw new Error(
      "DATABASE_URL_TEST must be set to the disposable test database URL.",
    );
  }
  if (testUrl === process.env.DATABASE_URL) {
    throw new Error(
      "Refusing to run database tests: DATABASE_URL_TEST matches DATABASE_URL.",
    );
  }
  return testUrl;
}

const testDatabaseUrl = loadTestDatabaseUrl();
// Point the application singleton at the same disposable database. This is set
// before the service module (and therefore `lib/prisma`) is imported below.
process.env.DATABASE_URL = testDatabaseUrl;

// Test files share one disposable database, so serialize them with a
// PostgreSQL advisory lock. A single pooled connection guarantees the session
// holding the lock stays alive until `afterAll`.
const testPrisma = new PrismaClient({
  datasourceUrl: `${testDatabaseUrl}${testDatabaseUrl.includes("?") ? "&" : "?"}connection_limit=1`,
});

const TEST_DATABASE_LOCK_KEY = 728674001;

const { requireUser, UnauthorizedError } = await import(
  "@/features/identity/server/guards"
);
const { deleteAddress, listAddresses, saveAddress, setDefaultAddress, updateAddress } =
  await import("../address-actions");
const { addressInputSchema } = await import("../schemas");

const requireUserMock = vi.mocked(requireUser);

const USER_A = {
  id: "address-user-a",
  email: "address-a@example.com",
  role: "CUSTOMER" as const,
};

const USER_B = {
  id: "address-user-b",
  email: "address-b@example.com",
  role: "CUSTOMER" as const,
};

const ADDRESS = {
  fullName: "Ada Lovelace",
  line1: "12 Analytical Engine Way",
  line2: "Suite 200",
  city: "London",
  region: "Greater London",
  postalCode: "EC1A 1BB",
  country: "GB",
};

async function createUser(user: typeof USER_A) {
  return testPrisma.user.create({
    data: {
      id: user.id,
      name: user.id,
      email: user.email,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

async function createAddressFor(
  userId: string,
  overrides: Partial<typeof ADDRESS> & { isDefault?: boolean } = {},
) {
  return testPrisma.address.create({
    data: {
      userId,
      ...ADDRESS,
      isDefault: overrides.isDefault ?? false,
      ...overrides,
    },
  });
}

beforeEach(async () => {
  // Foreign-key order matters: children before parents.
  await testPrisma.orderAuditLog.deleteMany();
  await testPrisma.reservation.deleteMany();
  await testPrisma.payment.deleteMany();
  await testPrisma.orderItem.deleteMany();
  await testPrisma.order.deleteMany();
  await testPrisma.webhookEvent.deleteMany();
  await testPrisma.address.deleteMany();
  await testPrisma.productImage.deleteMany();
  await testPrisma.productVariant.deleteMany();
  await testPrisma.product.deleteMany();
  await testPrisma.category.deleteMany();
  await testPrisma.user.deleteMany();

  await createUser(USER_A);
  await createUser(USER_B);

  vi.clearAllMocks();
  requireUserMock.mockResolvedValue(USER_A);
});

beforeAll(async () => {
  await testPrisma.$queryRawUnsafe(
    `WITH lock AS (SELECT pg_advisory_lock(${TEST_DATABASE_LOCK_KEY})) SELECT 1 AS locked FROM lock`,
  );
});

afterAll(async () => {
  await testPrisma.$queryRawUnsafe(
    `SELECT pg_advisory_unlock(${TEST_DATABASE_LOCK_KEY}) AS unlocked`,
  );
  await testPrisma.$disconnect();
});

describe("session ownership", () => {
  it("rejects anonymous callers before touching any address row", async () => {
    requireUserMock.mockRejectedValue(new UnauthorizedError());

    await expect(saveAddress(ADDRESS)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    await expect(listAddresses()).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(updateAddress("missing", ADDRESS)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    await expect(setDefaultAddress("missing")).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    await expect(deleteAddress("missing")).rejects.toBeInstanceOf(
      UnauthorizedError,
    );

    expect(await testPrisma.address.count()).toBe(0);
  });

  it("ignores a caller-supplied userId and stores the session id", async () => {
    const forged = {
      ...ADDRESS,
      userId: USER_B.id,
    } as unknown as Parameters<typeof saveAddress>[0];

    const saved = await saveAddress(forged);

    expect(saved.userId).toBe(USER_A.id);
    expect(saved.userId).not.toBe(USER_B.id);
    expect(await testPrisma.address.count({ where: { userId: USER_B.id } })).toBe(
      0,
    );
  });

  it("does not list, update, default, or delete another user's address", async () => {
    const otherAddress = await createAddressFor(USER_B.id, {
      isDefault: true,
    });

    await expect(listAddresses()).resolves.toEqual([]);

    await expect(
      updateAddress(otherAddress.id, {
        ...ADDRESS,
        line1: "Attacker-controlled street",
      }),
    ).rejects.toThrow("Address not found.");

    await expect(setDefaultAddress(otherAddress.id)).rejects.toThrow(
      "Address not found.",
    );

    await deleteAddress(otherAddress.id);

    const untouched = await testPrisma.address.findUniqueOrThrow({
      where: { id: otherAddress.id },
    });
    expect(untouched).toMatchObject({
      userId: USER_B.id,
      line1: ADDRESS.line1,
      isDefault: true,
    });
  });
});

describe("production address shape", () => {
  it("persists fullName, line1, line2, and region", async () => {
    const saved = await saveAddress(ADDRESS);

    expect(saved).toMatchObject(ADDRESS);
    await expect(listAddresses()).resolves.toMatchObject([ADDRESS]);
  });

  it("updates region and clears line2 when it is omitted", async () => {
    const saved = await saveAddress(ADDRESS);

    const updated = await updateAddress(saved.id, {
      ...ADDRESS,
      city: "San Francisco",
      region: "CA",
      line2: undefined,
    });

    expect(updated).toMatchObject({
      id: saved.id,
      userId: USER_A.id,
      city: "San Francisco",
      region: "CA",
      line2: null,
    });

    const [listed] = await listAddresses();
    expect(listed).toMatchObject({ region: "CA", line2: null });
  });

  it("rejects a demo-shaped payload missing the production fields", async () => {
    const demoShaped = {
      firstName: "Ada",
      lastName: "Lovelace",
      address: "12 Analytical Engine Way",
      city: "London",
      postalCode: "EC1A 1BB",
      country: "GB",
    };

    await expect(saveAddress(demoShaped)).rejects.toThrow();
    await expect(addressInputSchema.parseAsync(demoShaped)).rejects.toThrow();
    expect(await testPrisma.address.count()).toBe(0);
  });
});

describe("default address", () => {
  it("unsets the previous default and sets the new one atomically", async () => {
    const first = await saveAddress({ ...ADDRESS, isDefault: true });
    const second = await saveAddress({
      ...ADDRESS,
      line1: "2 Difference Engine Road",
    });

    await setDefaultAddress(second.id);

    const rows = await listAddresses();
    expect(rows.filter((row) => row.isDefault)).toHaveLength(1);
    expect(rows.find((row) => row.isDefault)?.id).toBe(second.id);
    expect(rows.find((row) => row.id === first.id)?.isDefault).toBe(false);
  });

  it("rolls back the unset step when the target does not exist", async () => {
    const current = await saveAddress({ ...ADDRESS, isDefault: true });

    await expect(setDefaultAddress("missing-address")).rejects.toThrow(
      "Address not found.",
    );

    const reloaded = await testPrisma.address.findUniqueOrThrow({
      where: { id: current.id },
    });
    expect(reloaded.isDefault).toBe(true);
    expect(
      await testPrisma.address.count({ where: { isDefault: true } }),
    ).toBe(1);
  });

  it("pins delete-of-default behavior: no remaining address becomes default", async () => {
    const current = await saveAddress({ ...ADDRESS, isDefault: true });
    const remaining = await saveAddress({
      ...ADDRESS,
      line1: "2 Difference Engine Road",
    });

    await deleteAddress(current.id);

    const rows = await listAddresses();
    expect(rows.map((row) => row.id)).toEqual([remaining.id]);
    expect(rows.some((row) => row.isDefault)).toBe(false);
  });
});

describe("order snapshot isolation", () => {
  it("keeps the order's shipping snapshot after the saved address is deleted", async () => {
    const saved = await saveAddress({ ...ADDRESS, line2: "Floor 3" });

    const order = await testPrisma.order.create({
      data: {
        userId: USER_A.id,
        status: "PENDING",
        fulfillmentStatus: "UNFULFILLED",
        currency: "USD",
        subtotalCents: 1999,
        shippingCents: 500,
        taxCents: 160,
        totalCents: 2659,
        shippingFullName: saved.fullName,
        shippingLine1: saved.line1,
        shippingLine2: saved.line2,
        shippingCity: saved.city,
        shippingRegion: saved.region,
        shippingPostalCode: saved.postalCode,
        shippingCountry: saved.country,
        idempotencyKey: "address-snapshot-key",
      },
    });

    await deleteAddress(saved.id);
    expect(await testPrisma.address.count()).toBe(0);

    const reloaded = await testPrisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });

    expect(reloaded).toMatchObject({
      shippingFullName: ADDRESS.fullName,
      shippingLine1: ADDRESS.line1,
      shippingLine2: "Floor 3",
      shippingCity: ADDRESS.city,
      shippingRegion: ADDRESS.region,
      shippingPostalCode: ADDRESS.postalCode,
      shippingCountry: ADDRESS.country,
    });
  });
});
