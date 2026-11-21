-- Add WishlistItem model (Task 08: cross-device wishlist sync)
-- 1. Create WishlistItem with @@unique([userId, productSlug]) so one row per
--    user+slug; re-wishing is an idempotent upsert, never a duplicate row.
-- 2. FK to "user" ON DELETE CASCADE: deleting a user removes their wishlist
--    rows; guests keep localStorage-only state and never create rows.
-- 3. Every query predicates on userId (getWishlist, setWishlisted); no
--    cross-user access is possible at the query layer.
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productSlug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WishlistItem_userId_idx" ON "WishlistItem"("userId");

CREATE UNIQUE INDEX "WishlistItem_userId_productSlug_key" ON "WishlistItem"("userId", "productSlug");

ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
