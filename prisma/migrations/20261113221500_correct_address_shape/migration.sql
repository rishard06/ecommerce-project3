-- Corrective migration: replace the demo-shaped address columns with the
-- production shipping contract while preserving existing customer data.
--
-- Backfill:
--   firstName + lastName -> fullName
--   address              -> line1
--
-- `region` has no legacy source column, so existing rows receive an empty
-- string. The application always validates a non-empty region on new writes.

-- AlterTable
ALTER TABLE "address" ADD COLUMN "fullName" TEXT;
ALTER TABLE "address" ADD COLUMN "line1" TEXT;
ALTER TABLE "address" ADD COLUMN "line2" TEXT;
ALTER TABLE "address" ADD COLUMN "region" TEXT NOT NULL DEFAULT '';

-- Backfill the new production columns from the merge-shaped columns.
UPDATE "address"
SET "fullName" = BTRIM("firstName" || ' ' || "lastName"),
    "line1" = "address";

ALTER TABLE "address" ALTER COLUMN "fullName" SET NOT NULL;
ALTER TABLE "address" ALTER COLUMN "line1" SET NOT NULL;
ALTER TABLE "address" ALTER COLUMN "region" DROP DEFAULT;

-- AlterTable
ALTER TABLE "address" DROP COLUMN "address",
DROP COLUMN "firstName",
DROP COLUMN "lastName";
