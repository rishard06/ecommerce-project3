-- AlterEnum: remove SHIPPED from OrderStatus.
--
-- Preflight query (run against the target database before deploying):
--   SELECT "id", "status", "createdAt" FROM "Order" WHERE "status" = 'SHIPPED';
-- Every row returned is remapped to PAID by the UPDATE below.
--
-- Existing SHIPPED rows would abort the enum type swap because 'SHIPPED' is
-- absent from "OrderStatus_new". PAID is chosen deliberately: an order cannot
-- have shipped without having been paid, and mapping to CANCELLED would hide
-- revenue that was actually collected.
BEGIN;
UPDATE "Order" SET "status" = 'PAID' WHERE "status" = 'SHIPPED';
CREATE TYPE "OrderStatus_new" AS ENUM ('PENDING', 'PAID', 'CANCELLED');
ALTER TABLE "public"."Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "public"."OrderStatus_old";
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;
