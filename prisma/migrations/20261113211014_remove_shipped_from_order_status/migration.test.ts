import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/app/generated/prisma";

const migrationSql = readFileSync(
  fileURLToPath(new URL("./migration.sql", import.meta.url)),
  "utf8",
);

/**
 * The migration is normally applied by `prisma migrate deploy`, which owns the
 * transaction. These are the statements the migration runs between BEGIN and
 * COMMIT, with the `public` schema qualifier removed so they can be applied to
 * an isolated scratch schema in the database-backed test below.
 */
function migrationStatements(): string[] {
  return migrationSql
    .replace(/"public"\./g, "")
    .replace(/^\s*(BEGIN|COMMIT);\s*$/gm, "")
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

describe("remove_shipped_from_order_status migration", () => {
  it("documents the preflight query for existing SHIPPED orders", () => {
    expect(migrationSql).toMatch(/-- Preflight query/);
    expect(migrationSql).toMatch(
      /SELECT "id", "status", "createdAt" FROM "Order" WHERE "status" = 'SHIPPED';/,
    );
  });

  it("remaps SHIPPED to PAID inside the transaction before the enum swap", () => {
    const remap =
      'UPDATE "Order" SET "status" = \'PAID\' WHERE "status" = \'SHIPPED\';';
    const remapIndex = migrationSql.indexOf(remap);
    const typeSwapIndex = migrationSql.indexOf(
      'ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus_new"',
    );

    expect(remapIndex).toBeGreaterThan(-1);
    expect(typeSwapIndex).toBeGreaterThan(-1);
    expect(remapIndex).toBeLessThan(typeSwapIndex);
    expect(migrationSql.indexOf("BEGIN;")).toBeLessThan(remapIndex);
    expect(remapIndex).toBeLessThan(migrationSql.indexOf("COMMIT;"));
  });

  it("explains why PAID, not CANCELLED, is the mapping", () => {
    expect(migrationSql).toMatch(
      /cannot[\s\S]*?have shipped without having been paid/i,
    );
    expect(migrationSql).toMatch(/CANCELLED would hide[\s\S]*?revenue/i);
  });

  it("rebuilds the enum without SHIPPED", () => {
    expect(migrationSql).toMatch(
      /CREATE TYPE "OrderStatus_new" AS ENUM \('PENDING', 'PAID', 'CANCELLED'\);/,
    );
    expect(migrationSql).not.toMatch(
      /CREATE TYPE "OrderStatus_new" AS ENUM \([^)]*'SHIPPED'/,
    );
  });
});

try {
  process.loadEnvFile?.(".env");
} catch {
  // `.env` is optional; the test URL may be provided by the shell.
}

const testDatabaseUrl = process.env.DATABASE_URL_TEST;

/**
 * Insertion proof: apply the real migration statements to a scratch schema
 * that still has the pre-migration enum (including SHIPPED) and verify a
 * SHIPPED order is remapped instead of aborting the type swap.
 */
describe.skipIf(!testDatabaseUrl)(
  "remove_shipped_from_order_status migration (database)",
  () => {
    let prisma: PrismaClient | undefined;

    afterAll(async () => {
      await prisma?.$disconnect();
    });

    it("converts existing SHIPPED orders to PAID", async () => {
      if (!testDatabaseUrl) throw new Error("DATABASE_URL_TEST is not set");

      prisma ??= new PrismaClient({ datasourceUrl: testDatabaseUrl });
      const schema = `migration_test_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      try {
        await prisma.$transaction(
          async (tx) => {
            await tx.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
            await tx.$executeRawUnsafe(
              `SET LOCAL search_path TO "${schema}"`,
            );
            await tx.$executeRawUnsafe(
              `CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'SHIPPED')`,
            );
            await tx.$executeRawUnsafe(
              `CREATE TABLE "Order" ("id" TEXT PRIMARY KEY, "status" "OrderStatus" NOT NULL DEFAULT 'PENDING')`,
            );
            await tx.$executeRawUnsafe(
              `INSERT INTO "Order" ("id", "status") VALUES ('shipped-order', 'SHIPPED'), ('paid-order', 'PAID')`,
            );

            for (const statement of migrationStatements()) {
              await tx.$executeRawUnsafe(statement);
            }

            const rows = await tx.$queryRawUnsafe<
              Array<{ id: string; status: string }>
            >(
              `SELECT "id", "status"::text AS "status" FROM "Order" ORDER BY "id"`,
            );
            expect(rows).toEqual([
              { id: "paid-order", status: "PAID" },
              { id: "shipped-order", status: "PAID" },
            ]);
          },
          { timeout: 30_000 },
        );
      } finally {
        await prisma.$executeRawUnsafe(
          `DROP SCHEMA IF EXISTS "${schema}" CASCADE`,
        );
      }
    }, 30_000);
  },
);
