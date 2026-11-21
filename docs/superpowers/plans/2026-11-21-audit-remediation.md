# Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remediate 11 ponytail-audit findings (security, perf, SEO, theme) in two shippable batches.

**Architecture:** Batch A hardens edge (rate-limit + headers + a11y + WebGL cost + single animation runtime). Batch B grows discovery (search, SEO, wishlist sync, theme token unify, pagination/cache). Each batch cuts its own feature branch from fresh `origin/main`, runs in dependency order DB → API → UI.

**Tech Stack:** Next.js 15 App Router, React 19, Prisma 6 + Postgres, Better-Auth, Stripe, Tailwind v4, Vitest + Testing Library.

**Spec:** ponytail-audit report 2026-11-21 (11 numbered findings) + pipeline `C:\Users\Jerrymy\.opencode\plan\fullstack-feature-pipeline.md`

## Global Constraints

- Alias `@/*` for all imports, Server Components by default, `"use client"` only for hooks/handlers/browser APIs.
- Tailwind v4 `@theme` tokens (`bg-background`, `text-foreground`); never hardcode colors; Lucide icons, no emoji icons.
- Validate with Zod; `npm run test:ci` (full `vitest run` serial) + `npm run typecheck` + `npm run build` green per ticket.
- Never commit `.env`; new env vars go in plan + `.env.example`.
- One feature branch per batch from fresh `origin/main` (`feat/audit-batch-a`, `feat/audit-batch-b`); merge commit, never squash; sync before PR.
- TDD mandatory: failing test first, watch fail, minimal code, green suite per ticket.
- Contract discipline: if build changes API shape, update this plan + upstream tickets first.
- Model routing: mechanical implementers → `opencode-go/deepseek-v4.1-flash`; judgment / reviewers / PR body / final review → `muse spark 1.3 contributor xhigh`.

## Review Focus

- Brute-force login/coupon spam with 100+ rapid hits — expect 429, not 200.
- Iframed checkout page — expect `X-Frame-Options: DENY` + CSP frame-ancestors.
- Screen-reader on product grid — expect image `alt` = product title, not silence.
- Low-end mobile on `/` — expect no WebGL download, CSS fallback still readable.
- Search for word only in description (e.g. "oak") — expect hits, not empty state.

---

## Batch A — Harden Edge (Tasks 1-5) — branch `feat/audit-batch-a`

### Task 1: Rate-limit auth + checkout + coupons

**Files:**
- Create: `lib/rate-limit.ts`
- Create: `lib/__tests__/rate-limit.test.ts`
- Modify: `app/api/checkout/route.ts` (or `features/checkout/server/create-pending-order.ts` callsite)
- Modify: auth route wiring (`lib/auth.ts` callsite)
- Test: `features/coupons/server/actions.test.ts` (add 429 case)

**Interfaces:**
- Consumes: existing Zod schemas, `headers()` IP.
- Produces: `checkRateLimit(key: string, limit: number, windowMs: number) => { ok: boolean; retryAfter: number }`

- [ ] **Step 1: Write failing test** `lib/__tests__/rate-limit.test.ts::blocks after N hits` + route test asserting 429 on 101st coupon guess.
- [ ] **Step 2: Run to verify fail** `npm test -- rate-limit` Expected: FAIL "function not defined".
- [ ] **Step 3: Implement `checkRateLimit` in `lib/rate-limit.ts`** sliding-window in-memory (Upstash-ready interface), wire into checkout + coupon + auth handlers returning 429 + `Retry-After`.
- [ ] **Step 4: Run tests pass** `npm run test:ci` Expected: PASS. `npm run typecheck` clean.
- [ ] **Step 5: Commit** `git add lib/rate-limit.ts lib/__tests__/rate-limit.test.ts <routes>` `git commit -m "feat(security): rate-limit auth checkout coupons"`

### Ticket 1 file map: rate-limit (API)
**Contract:** 429 + `Retry-After` header on exceed; req unchanged; res adds error code `RATE_LIMITED`.
**Review focus:** empty IP, zero limit, burst boundary, auth vs anon keys.

### Task 2: Security headers + middleware

**Files:**
- Create: `middleware.ts`
- Modify: `next.config.mjs:1-33`
- Test: `middleware.test.ts` (header assertions)

**Interfaces:**
- Consumes: `next/server` NextResponse.
- Produces: headers `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, CSP allowing Stripe + self.

- [ ] **Step 1: Write failing test** asserting `middleware` sets DENY + CSP on `/checkout`.
- [ ] **Step 2: Run fail** Expected: FAIL no middleware.
- [ ] **Step 3: Implement `middleware.ts` + `headers()` in `next.config.mjs`**.
- [ ] **Step 4: Verify** `npm run build && npm start` curl `-I` shows headers; tests PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(security): add headers middleware"`

### Task 3: Product image alt

**Files:**
- Modify: `features/products/components/ProductCard.tsx:145-155`
- Test: `features/products/components/__tests__/ProductCard.test.tsx` (alt assertion)

- [ ] **Step 1: Write failing test** `alt === title`.
- [ ] **Step 2: Run fail** Expected: FAIL received `""`.
- [ ] **Step 3: Implement `alt={title}`** in `ProductCard.tsx`.
- [ ] **Step 4: Run pass**.
- [ ] **Step 5: Commit** `git commit -m "fix(a11y): product image alt"`

### Task 4: Lazy WebGL hero background

**Files:**
- Modify: `components/layout/MeshGradientBackground.tsx:15-32`, `components/layout/Header.tsx:1-12`
- Test: `components/layout/__tests__/MeshGradientBackground.test.tsx` (existing mock + reduced-motion/mobile case)

- [ ] **Step 1: Write failing test** mobile width / reduced-motion renders CSS fallback, no `MeshGradient`.
- [ ] **Step 2: Run fail**.
- [ ] **Step 3: Implement `next/dynamic(ssr:false)` + `useReducedMotion` + media-query gate**, keep gradient div fallback.
- [ ] **Step 4: Verify** tests PASS, Lighthouse LCP improves.
- [ ] **Step 5: Commit** `git commit -m "perf: lazy hero WebGL"`

### Task 5: Single animation runtime

**Files:**
- Modify: `components/animations/SplitText.tsx:5`, `package.json:18-31`
- Test: existing `SplitText.test.tsx` must pass on Motion port.

- [ ] **Step 1: Write failing render test** SplitText with Motion only (mock `@gsap/react` absent).
- [ ] **Step 2: Run fail**.
- [ ] **Step 3: Port `useGSAP` → `motion/react` animate**, remove `@gsap/react` + `gsap` deps.
- [ ] **Step 4: Run full suite** `npm run test:ci` PASS.
- [ ] **Step 5: Commit** `git commit -m "perf: drop gsap keep motion"`

---

## Batch B — Discovery + Theme (Tasks 6-11) — branch `feat/audit-batch-b` (starts after A merges, rebased on `origin/main`)

### Task 6: Search description/brand

**Files:**
- Modify: `features/products/search.ts:58-79`, `features/products/search.test.ts`
- **Contract:** `GET /products?q=` unchanged; recall improves.

- [ ] **Step 1: Write failing test** `searchProducts({q:"oak"})` hits description-only product.
- [ ] **Step 2: Run fail** Expected: 0 rows.
- [ ] **Step 3: Implement** add `description` + `brand` to `OR` + price-query `ILIKE`; add index in follow-up migration if needed.
- [ ] **Step 4: Run pass** `npm run test:ci`.
- [ ] **Step 5: Commit** `git commit -m "feat(search): match description brand"`

### Task 7: SEO — OG + sitemap + JSON-LD

**Files:**
- Modify: `app/layout.tsx:26-33`
- Create: `app/sitemap.ts`, `app/robots.ts`
- Modify: `app/(shop)/products/[id]/page.tsx:1-62` (JSON-LD)
- Test: `app/sitemap.test.ts` (routes present), metadata snapshot.

- [ ] **Step 1: Write failing test** sitemap includes product slug; metadata has `openGraph`.
- [ ] **Step 2: Run fail**.
- [ ] **Step 3: Implement** `openGraph`/`twitter`/`metadataBase`, `sitemap.ts` from Prisma, `Product` JSON-LD.
- [ ] **Step 4: Run pass** + `npm run build` validates routes.
- [ ] **Step 5: Commit** `git commit -m "feat(seo): og sitemap json-ld"`

### Task 8: Wishlist DB sync

**Files:**
- Modify: `prisma/schema.prisma` (new `WishlistItem`), migration
- Create: `features/wishlist/server/actions.ts` + test
- Modify: `lib/store/favorites-store.ts`
- **Contract:** `GET/POST /api/wishlist` `{ slug }` → `{ items: string[] }`, 401 when anon.

- [ ] **Step 1: Write failing API test** POST persists, GET returns after relogin.
- [ ] **Step 2: Run fail**.
- [ ] **Step 3: Implement** `migrate dev --name wishlist` → `generate` → verify client → seed → API + store sync on login, localStorage stays cache.
- [ ] **Step 4: Run pass** full suite + fresh-DB seed check.
- [ ] **Step 5: Commit** `git commit -m "feat(wishlist): db sync"`

### Task 9: Unify theme tokens

**Files:**
- Modify: `app/globals.css:18-50`, `features/products/components/ProductCard.tsx:172-174` CTA class
- Test: visual snapshot + contrast test (4.5:1 body).

- [ ] **Step 1: Write failing test** CTA uses single `--color-action`, no `bg-primary-500` vs `bg-accent-500` mix.
- [ ] **Step 2: Run fail**.
- [ ] **Step 3: Implement** keep sage+ink, map action → lime only, blue → ring/info; fix dark `glass-component`.
- [ ] **Step 4: Run pass**.
- [ ] **Step 5: Commit** `git commit -m "fix(theme): single action color"`

### Task 10: Cursor pagination (guarded)

**Files:**
- Modify: `app/(shop)/products/page.tsx:24-33`, `features/products/search.ts:47-52`
- Test: page 2 with cursor returns stable order after insert.

- [ ] **Step 1: Write failing test** insert during paging does not duplicate.
- [ ] **Step 2: Run fail** (documents skip-offset flaw, skipped until catalog >2k — implement behind flag).
- [ ] **Step 3: Implement** cursor on `(slug)` alongside `skip` compat.
- [ ] **Step 4: Run pass**.
- [ ] **Step 5: Commit** `git commit -m "perf: cursor pagination"`

### Task 11: Cache product detail + related

**Files:**
- Modify: `app/(shop)/products/[id]/page.tsx:14-21`, `lib/products.ts:72-80`
- Test: two calls hit DB once (prisma mock count).

- [ ] **Step 1: Write failing test** `getProduct` + related cached 60s.
- [ ] **Step 2: Run fail**.
- [ ] **Step 3: Implement `unstable_cache` 60s** + `Promise.all` for related.
- [ ] **Step 4: Run pass**.
- [ ] **Step 5: Commit** `git commit -m "perf: cache product detail"`

---

## Done criteria (both batches)

- [ ] Every ticket tests green on full `vitest run`, `tsc`/build clean, migration+seed verified on fresh DB.
- [ ] Final whole-branch review (xhigh, Standards + Spec axes) passed.
- [ ] PR body `## Summary / ## Evidence / ## Merge Danger` per `.agents/skills/pr`.
- [ ] Retro queued (weekly, not inline).
