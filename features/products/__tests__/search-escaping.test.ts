import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@/app/generated/prisma";

/**
 * End-to-end proof against the disposable test database: LIKE wildcards in
 * shopper input are matched literally on both query paths, plain-word recall
 * is unchanged, and the trigram indexes the migration promises actually exist.
 *
 * Database suites share one test database, so this file serializes on the same
 * kind of advisory lock used by the other DB-backed suites.
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
process.env.DATABASE_URL = testDatabaseUrl;

const testPrisma = new PrismaClient({
  datasourceUrl: `${testDatabaseUrl}${testDatabaseUrl.includes("?") ? "&" : "?"}connection_limit=1`,
});

const TEST_DATABASE_LOCK_KEY = 728674001;

// Import after DATABASE_URL points at the disposable database.
const { searchProducts } = await import("@/features/products/search");

const CATEGORY_SLUG = "t15-search";
const PRODUCT_SLUG_PREFIX = "t15-";

interface Fixture {
  slug: string;
  title: string;
  description: string;
  brand?: string;
  priceCents: number;
}

const FIXTURES: Fixture[] = [
  {
    slug: "t15-percent",
    title: "100% Cotton Tee",
    description: "Literal percent sign.",
    brand: "Acme",
    priceCents: 2000,
  },
  {
    slug: "t15-percent-wildcard-decoy",
    title: "100 Cotton Tee",
    description: "No percent sign; only a wildcard would match it.",
    brand: "Acme",
    priceCents: 1000,
  },
  {
    slug: "t15-underscore",
    title: "snake_case widget",
    description: "Literal underscore.",
    brand: "Acme",
    priceCents: 3000,
  },
  {
    slug: "t15-underscore-decoy",
    title: "snakeXcase widget",
    description: "No underscore; only a wildcard would match it.",
    brand: "Acme",
    priceCents: 4000,
  },
  {
    slug: "t15-backslash",
    title: "back\\slash tool",
    description: "Literal backslash.",
    brand: "Acme",
    priceCents: 5000,
  },
  {
    slug: "t15-backslash-decoy",
    title: "backslash tool",
    description: "No backslash; only an unescaped pattern would match it.",
    brand: "Acme",
    priceCents: 6000,
  },
];

async function clearFixtures() {
  await testPrisma.productVariant.deleteMany({
    where: { product: { slug: { startsWith: PRODUCT_SLUG_PREFIX } } },
  });
  await testPrisma.product.deleteMany({
    where: { slug: { startsWith: PRODUCT_SLUG_PREFIX } },
  });
  await testPrisma.category.deleteMany({ where: { slug: CATEGORY_SLUG } });
}

async function seedFixtures() {
  const category = await testPrisma.category.create({
    data: { slug: CATEGORY_SLUG, name: "T15 Search" },
  });

  await Promise.all(
    FIXTURES.map((fixture) =>
      testPrisma.product.create({
        data: {
          slug: fixture.slug,
          title: fixture.title,
          description: fixture.description,
          brand: fixture.brand,
          status: "ACTIVE",
          categoryId: category.id,
          variants: {
            create: [
              {
                sku: fixture.slug,
                name: "Default",
                priceCents: fixture.priceCents,
                onHand: 5,
                isDefault: true,
              },
            ],
          },
        },
      }),
    ),
  );
}

async function acquireDatabaseLock() {
  await testPrisma.$queryRawUnsafe(
    `WITH lock AS (SELECT pg_advisory_lock(${TEST_DATABASE_LOCK_KEY})) SELECT 1 AS locked FROM lock`,
  );
}

async function releaseDatabaseLock() {
  await testPrisma.$queryRawUnsafe(
    `SELECT pg_advisory_unlock(${TEST_DATABASE_LOCK_KEY}) AS unlocked`,
  );
}

// Hold the shared suite lock only for one test at a time: fixtures are
// re-seeded under the lock, so a longer suite cannot starve the other DB
// suites' 10 s lock-acquisition hooks when files run in parallel.
beforeEach(async () => {
  await acquireDatabaseLock();
  await clearFixtures();
  await seedFixtures();
}, 60_000);

afterEach(async () => {
  await clearFixtures();
  await releaseDatabaseLock();
}, 60_000);

afterAll(async () => {
  // Defensive: never leave the shared lock held if a hook failed midway.
  await releaseDatabaseLock().catch(() => undefined);
  await testPrisma.$disconnect();
}, 60_000);

describe("searchProducts LIKE escaping (database)", () => {
  it("matches a literal percent sign instead of treating it as a wildcard", async () => {
    const result = await searchProducts({ q: "100%" });

    expect(result.products.map((product) => product.slug)).toEqual([
      "t15-percent",
    ]);
    expect(result.total).toBe(1);
  });

  it("matches a literal underscore instead of treating it as one-character wildcard", async () => {
    const result = await searchProducts({ q: "snake_case" });

    expect(result.products.map((product) => product.slug)).toEqual([
      "t15-underscore",
    ]);
  });

  it("matches a literal backslash instead of escaping the next character", async () => {
    const result = await searchProducts({ q: "back\\slash" });

    expect(result.products.map((product) => product.slug)).toEqual([
      "t15-backslash",
    ]);
  });

  it("applies the same escaping on the raw-SQL price-sorted path", async () => {
    const result = await searchProducts({ q: "100%", sort: "price-asc" });

    expect(result.products.map((product) => product.slug)).toEqual([
      "t15-percent",
    ]);
  });

  it("keeps ordinary-word recall unchanged", async () => {
    const result = await searchProducts({ q: "cotton" });

    expect(result.products.map((product) => product.slug)).toEqual([
      "t15-percent",
      "t15-percent-wildcard-decoy",
    ]);
  });
});

describe("search trigram indexes (database)", () => {
  it("has a GIN pg_trgm index for every searched product column", async () => {
    const rows = await testPrisma.$queryRawUnsafe<
      Array<{ indexname: string; indexdef: string }>
    >(
      `SELECT indexname, indexdef
         FROM pg_indexes
        WHERE schemaname = current_schema()
          AND tablename = 'product'
          AND indexname LIKE '%\\_trgm\\_idx'
        ORDER BY indexname`,
    );

    expect(rows.map((row) => row.indexname)).toEqual([
      "product_brand_trgm_idx",
      "product_description_trgm_idx",
      "product_slug_trgm_idx",
      "product_title_trgm_idx",
    ]);
    for (const row of rows) {
      expect(row.indexdef).toMatch(/USING gin/i);
      expect(row.indexdef).toContain("gin_trgm_ops");
    }
  });
});
