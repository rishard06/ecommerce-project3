-- Add Coupon model + Order discount snapshot (Task 9 owns all Batch 2 schema changes)
-- 1. Create Coupon with unique code, optional percent/fixed legs, minimums, expiry, usage cap
-- 2. Add Order.discountCents (integer cents, default 0) + Order.couponCode snapshot for Task 10
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "percentOff" INTEGER,
    "amountOffCents" INTEGER,
    "minSubtotalCents" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

ALTER TABLE "Order" ADD COLUMN "discountCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "couponCode" TEXT;
