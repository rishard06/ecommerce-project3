-- Add RateLimit model (Ticket #10: auth brute-force protection)
-- Better Auth DB-backed rate limiting (`rateLimit.storage: "database"` in
-- `lib/auth.ts`) persists one row per `IP|path` key in this table. The
-- limiter reads/writes `count` + `lastRequest` through the Prisma adapter;
-- rows expire logically via the sliding window (no TTL column needed).
CREATE TABLE "rateLimit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,

    CONSTRAINT "rateLimit_pkey" PRIMARY KEY ("id")
);
