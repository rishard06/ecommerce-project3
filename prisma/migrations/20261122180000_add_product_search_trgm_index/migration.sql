-- Trigram search indexes for Ticket #15 (catalog search).
--
-- `features/products/search.ts` filters with `ILIKE '%q%'` across title, slug,
-- description and brand. A btree cannot serve a leading-wildcard pattern, so
-- every search was a sequential scan of "product": fine at ~194 rows, linear
-- as the catalog grows. GIN with the `gin_trgm_ops` opclass indexes the
-- trigrams inside each value, so PostgreSQL can bitmap-OR the four indexes and
-- only recheck candidate rows. Patterns shorter than 3 characters have no
-- trigrams and still fall back to a scan (the index is simply skipped).
--
-- The application escapes `%`, `_` and `\` before building the pattern, so a
-- shopper's `100%` is a literal substring, not a wildcard.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "product_title_trgm_idx" ON "product" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "product_slug_trgm_idx" ON "product" USING GIN ("slug" gin_trgm_ops);
CREATE INDEX "product_description_trgm_idx" ON "product" USING GIN ("description" gin_trgm_ops);
CREATE INDEX "product_brand_trgm_idx" ON "product" USING GIN ("brand" gin_trgm_ops);
