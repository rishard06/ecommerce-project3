import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@/app/generated/prisma";

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

const { getWishlist, setWishlisted } = await import("./actions");

const USER_A = {
  id: "wishlist-user-a",
  email: "wishlist-a@example.com",
};

const USER_B = {
  id: "wishlist-user-b",
  email: "wishlist-b@example.com",
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

beforeEach(async () => {
  // Foreign-key order matters: children before parents.
  await testPrisma.wishlistItem.deleteMany();
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

describe("getWishlist", () => {
  it("returns an empty list for a user with no wishlist rows", async () => {
    await expect(getWishlist(USER_A.id)).resolves.toEqual([]);
  });

  it("returns only the calling user's slugs in creation order", async () => {
    await setWishlisted(USER_A.id, "dummy-2", true);
    await setWishlisted(USER_A.id, "dummy-1", true);
    await setWishlisted(USER_B.id, "dummy-9", true);

    await expect(getWishlist(USER_A.id)).resolves.toEqual([
      "dummy-2",
      "dummy-1",
    ]);
    await expect(getWishlist(USER_B.id)).resolves.toEqual(["dummy-9"]);
  });
});

describe("setWishlisted", () => {
  it("adds a slug and returns the updated list", async () => {
    await expect(setWishlisted(USER_A.id, "dummy-1", true)).resolves.toEqual([
      "dummy-1",
    ]);
    expect(await testPrisma.wishlistItem.count()).toBe(1);
  });

  it("is idempotent: wishing the same slug twice stores one row", async () => {
    await setWishlisted(USER_A.id, "dummy-1", true);
    await expect(setWishlisted(USER_A.id, "dummy-1", true)).resolves.toEqual([
      "dummy-1",
    ]);
    expect(
      await testPrisma.wishlistItem.count({
        where: { userId: USER_A.id, productSlug: "dummy-1" },
      }),
    ).toBe(1);
  });

  it("removes the slug when wished is false and returns the updated list", async () => {
    await setWishlisted(USER_A.id, "dummy-1", true);
    await setWishlisted(USER_A.id, "dummy-2", true);

    await expect(setWishlisted(USER_A.id, "dummy-1", false)).resolves.toEqual([
      "dummy-2",
    ]);
  });

  it("unwishing an absent slug is a no-op", async () => {
    await expect(setWishlisted(USER_A.id, "dummy-1", false)).resolves.toEqual(
      [],
    );
  });

  it("never touches another user's rows", async () => {
    await setWishlisted(USER_A.id, "dummy-1", true);

    await expect(getWishlist(USER_B.id)).resolves.toEqual([]);
    await setWishlisted(USER_B.id, "dummy-1", false);

    await expect(getWishlist(USER_A.id)).resolves.toEqual(["dummy-1"]);
  });

  it("rejects slugs outside 1..128 chars without writing rows", async () => {
    await expect(setWishlisted(USER_A.id, "", true)).rejects.toThrow();
    await expect(
      setWishlisted(USER_A.id, "x".repeat(129), true),
    ).rejects.toThrow();
    expect(await testPrisma.wishlistItem.count()).toBe(0);
  });
});
