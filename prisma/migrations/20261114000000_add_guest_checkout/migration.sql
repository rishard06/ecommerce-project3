-- AlterTable: guest checkout support
-- 1. Make Order.userId nullable (guest orders have no user)
-- 2. Add guestToken for guest order access
ALTER TABLE "Order" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Order" ADD COLUMN "guestToken" TEXT;
CREATE UNIQUE INDEX "Order_guestToken_key" ON "Order"("guestToken");
-- Allow nulls in the user-scoped idempotency unique; guest path uses its own unique
-- Note: Postgres treats NULLs as distinct, so multiple guest NULL userIds are allowed.
CREATE UNIQUE INDEX "Order_guestToken_idempotencyKey_key" ON "Order"("guestToken", "idempotencyKey");
