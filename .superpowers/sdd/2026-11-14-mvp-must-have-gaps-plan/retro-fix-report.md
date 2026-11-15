# Retro Batch 1 Fix Report (I1, I3-code, I4)

Commit: `0442efa` — "fix(retro-batch1): route email/auth env via validated
schema, uniform reset confirmation, document email vars"

Scope: ONLY the Important items I1 / I3-code-half / I4. Untouched per
instructions: I2 (parked), rateLimit (deferred), minors 5–9 (ledgered).
Pre-existing dirty files (`CheckoutForm.tsx`, `order-repository.ts`,
`types.ts`, `create-checkout-session.ts`, `cancel/page.tsx`,
`skills-lock.json`, `.agents/`) were not touched and not staged.

## What changed

### I1 — Validated env routed through consumers (`lib/email/client.ts`, `lib/auth.ts`)
- `getResendKey()` / `getDefaultFrom()` now read via lazy `getServerEnv()`,
  so the `""` → absent normalization in `lib/env.ts:36-39` applies at runtime.
  On validation failure (e.g. unit tests stubbing only email vars, partial
  envs) they fall back to a normalized raw read (`""` → `undefined`),
  preserving the dev fallback (no key → `console.log` + `dev-<ts>` id) and
  the `EMAIL_FROM` default. Before the fix, `EMAIL_FROM=""` produced
  `from: ""`; after the fix it resolves to the default.
- `lib/auth.ts:10-15` replaced with `resolveAuthEnv()` via lazy
  `getServerEnv()` + normalized raw fallback. Preserves semantics: GitHub
  enabled only when both id + secret present, app-URL chain
  `BETTER_AUTH_URL → NEXT_PUBLIC_APP_URL → localhost`. Module stays
  import-safe when the full schema is unsatisfied (tests/partial envs).

### I3 (code half only) — `features/auth/components/ForgotPasswordForm.tsx`
- Removed verbatim `res.error.message` rendering and the divergent error UI.
  The form now always renders the uniform "Check your email for a reset
  link." confirmation; backend errors are logged internally via
  `console.error`. No `rateLimit` config added (deferred per controller
  ruling).

### I4 — `docs/production-setup.md`
- Added `RESEND_API_KEY` and `EMAIL_FROM` rows after `CRON_SECRET`, matching
  table style: Optional (server); dev-log/default fallback when unset;
  set in production for order-confirmation + auth emails.

### Tests
- `lib/email/client.test.ts`: new `treats_empty_email_from_as_absent_at_consumer_level`
  (`EMAIL_FROM=""` + valid key → `from` = default). Written type-clean
  (`as unknown as [...]`) so it adds zero new `tsc` errors.
- `features/auth/__tests__/password-reset.test.tsx`: new
  `forgot_form_shows_uniform_confirmation_on_backend_error` (`error: { message:
  "User not found" }` → same confirmation shown, backend text absent from UI).

## Tests run + output
- Focused: `npx vitest run lib/__tests__/env.test.ts lib/email/client.test.ts
  features/auth/__tests__/password-reset.test.tsx` → **3 files, 26 tests, all pass**.
- `npx tsc --noEmit` → 3 errors, all verified **pre-existing** (confirmed by
  stashing my test change and re-running): `lib/env.ts:43,57` (ZodEffects vs
  `ServerEnv`/`PublicEnv` optional types) and `lib/email/client.test.ts:29`
  (pre-existing `as [string, RequestInit]` cast). My changes add no new errors.
- Full `npx vitest run` → **27 files pass, 259 tests pass**; 6 DB-backed suites
  fail in `beforeAll` on `pg_advisory_lock` hook timeout (10s) — infra: no
  reachable test database in this environment. Unrelated to this change (none
  of the touched files are in the DB path); noted as pre-existing infra flake.

## Files (committed, 6)
- `lib/email/client.ts`, `lib/auth.ts`
- `features/auth/components/ForgotPasswordForm.tsx`
- `docs/production-setup.md`
- `lib/email/client.test.ts`, `features/auth/__tests__/password-reset.test.tsx`

## Concerns / follow-ups (not fixed, by instruction)
- `getServerEnv()` try/catch fallback means a misconfigured production env
  missing a *required* var still boots with raw reads in `client.ts`/`auth.ts`
  (other consumers fail fast via `getServerEnv()`). Acceptable: preserves
  current boot behavior; tightening to fail-fast is a follow-up decision.
- `tsc` pre-existing errors (`lib/env.ts` optional-string typing,
  `client.test.ts:29` cast) remain; not in scope.
- Full-suite DB infra (advisory-lock timeouts) needs a migrated
  `DATABASE_URL_TEST` to go green.

---

# Retro Batch 2 Fix Report — Wave A (I1, I3, I9)

Scope: ONLY Important items I1 / I3 / I9 from `retro-batch2.md`. Untouched:
I2, I4–I8, all minors, all carried-over/deferred items. Pre-existing dirty
files (`skills-lock.json`, `.agents/`) were not touched and not staged.

## What changed

### I1 — `REFUNDED` payment status (refund no longer reads as "never paid")
- `prisma/schema.prisma`: added `REFUNDED` to `PaymentStatus`.
- `prisma/migrations/20261116000000_add_refunded_payment_status/migration.sql`
  (NEW follow-up; the applied Batch 2 migration was not edited):
  `ALTER TYPE "PaymentStatus" ADD VALUE 'REFUNDED'`.
- `features/orders/server/admin-order-service.ts`: refund transaction writes
  `SUCCEEDED → REFUNDED` (was `CANCELLED`); the conditional guard still
  requires `SUCCEEDED`, so double-refunds and webhook races keep failing
  closed. Webhook remains the only path that marks PAID (`markCheckoutPaid`
  only advances `PENDING` rows; comment updated to name `REFUNDED` alongside
  `CANCELLED` as never-overwritten).
- `features/orders/types.ts`: `PaymentStatus` union gains `"REFUNDED"`.
- Badges: `AdminPaymentStatusBadge` += `REFUNDED → "Refunded"` (secondary);
  `PaymentStatusPill` += `REFUNDED → "Refunded"` (info). Admin list (via
  `listOrdersForAdmin`) and detail pages pick this up.
- `app/(shop)/checkout/success/page.tsx`: refunded orders (`CANCELLED` +
  payment `REFUNDED`) now render "Payment refunded" + a refund-settlement
  description (green), instead of "Payment was not completed … no payment is
  due". Derivation choice: **payment `REFUNDED` status, not the
  `ORDER_REFUNDED` audit row** — the refund transaction writes both
  atomically, and the payment row is what all read paths already select
  (documented in code + `docs/order-lifecycle.md`).
- `docs/order-lifecycle.md` (payment section only): `REFUNDED` row,
  `SUCCEEDED ──(admin refund)──▶ REFUNDED` edge, replaced the false
  "never happens" claim with the `CANCELLED` = never-paid / `REFUNDED` =
  money-returned invariant. OrderStatus table left for wave B (I6 owns it).

### I3 — PAID + cancelled-fulfillment orders are refundable via one predicate
- `features/orders/server/admin-order-service.ts`: new exported
  `refundBlockReason(order)` (single gate: `PAID` + fulfillment in
  `UNFULFILLED`/`PROCESSING`/`CANCELLED` + `SUCCEEDED` Stripe-intent payment)
  and `canRefund(order)` (`reason === null`). `assertRefundable` delegates to
  it, so the service and the page cannot diverge. `CANCELLED` fulfillment is
  refundable because cancellation is only legal pre-shipment — a `PAID` row
  with cancelled fulfillment was never shipped.
- Refund transaction (pre-check, in-tx guard, final `updateMany`) accepts the
  same three fulfillment states via `REFUNDABLE_FULFILLMENT_STATUSES`;
  `SHIPPED`/`DELIVERED` still blocked.
- `getOrderForAdmin` now also selects `providerPaymentIntentId`;
  `AdminOrderDetail.payment` carries it so the page can call the full
  predicate (intent check included). Admin detail refund card renders on
  `canRefund(order)` instead of `status === PAID && payment SUCCEEDED`.

### I9 — Cancelled orders render no dead buttons; action errors surface
- `visibleFulfillmentTransitions(order)` (service, exported): `[]` when
  `order.status === "CANCELLED"`, else the existing state machine. Admin
  detail page uses it and shows a "Cancelled orders are terminal — …" note
  for cancelled orders (generic "no further transitions" otherwise).
- New client components
  `app/(admin)/admin/orders/[id]/order-action-forms.tsx`
  (`FulfillmentActionForm`, `RefundActionForm`) wrap
  `updateFulfillmentAction`/`refundOrderAction` with `useActionState`
  (Task 9 `coupon-forms.tsx` precedent) and render `role="alert"` errors
  inline. The page's result-swallowing `submitFulfillment`/`submitRefund`
  wrappers are gone.

### Tests (TDD: written failing first, 9 failures confirmed pre-fix)
- `features/orders/server/admin-refund.test.ts`: refund test now asserts
  payment `REFUNDED`; new test refunds `PAID` + `CANCELLED` fulfillment +
  `SUCCEEDED` payment (Stripe called once, payment `REFUNDED`, order
  `CANCELLED`/`CANCELLED`, restock + `ORDER_REFUNDED` audit); retry no-op
  test unchanged and green; new pure `canRefund` matrix (UNFULFILLED/
  PROCESSING/CANCELLED allowed; SHIPPED/DELIVERED, non-PAID, non-SUCCEEDED
  incl. `REFUNDED`, missing/intent-less/non-Stripe refused).
- `features/orders/server/fulfillment-actions.test.ts`: new
  `refundOrderAction` error-surfacing tests (PENDING → `{success:false,
  /only paid/}`, missing id → validation error, no revalidate on failure);
  new `visibleFulfillmentTransitions` matrix (cancelled shapes → `[]`, live
  orders delegate).

## Tests run + output
- RED (pre-fix): `admin-refund` + `fulfillment-actions` → 9 failed / 34
  passed — exactly the new/updated behaviors (`REFUNDED` assertion,
  stranded-money refund, `canRefund`/`visibleFulfillmentTransitions`
  missing). Refund-action surfacing tests passed pre-fix (the action already
  returned errors; the fix wires them to the UI).
- GREEN (post-fix): same 2 files → all pass (15 + 28 tests); plus
  `create-checkout-session.test.ts` (checkout success page-related) green.
- Full: `npx vitest run --no-file-parallelism` → 37 files, **408 passed**,
  3 failed — all 3 are 5 s-timeout flakes in files this wave did NOT touch
  (`process-stripe-event` ×2, `release-expired-reservations` ×1, remote-DB
  latency). Re-runs: both files re-run green except one
  `release-expired-reservations` concurrency test, which passes with
  `--testTimeout=60000` (1 passed / 10 skipped) — infra latency, not logic.
- `npx tsc --noEmit` → clean (0 errors).
- `npx prisma validate` → schema valid; new migration applied to the test DB
  via `migrate deploy` (test DB only).

## Files (committed)
- `prisma/schema.prisma`,
  `prisma/migrations/20261116000000_add_refunded_payment_status/migration.sql`
- `features/orders/types.ts`,
  `features/orders/server/admin-order-service.ts`,
  `features/orders/components/AdminStatusBadges.tsx`,
  `features/orders/components/OrderStatusBadges.tsx`
- `features/orders/server/admin-refund.test.ts`,
  `features/orders/server/fulfillment-actions.test.ts`
- `features/payments/server/payment-transitions.ts` (guard comment only)
- `app/(shop)/checkout/success/page.tsx`,
  `app/(admin)/admin/orders/[id]/page.tsx`,
  `app/(admin)/admin/orders/[id]/order-action-forms.tsx` (new)
- `docs/order-lifecycle.md` (payment section only)
- this report

## Concerns / follow-ups (not fixed, by instruction)
- `docs/order-lifecycle.md` OrderStatus table still says `CANCELLED` = "No
  payment is due" and lacks the `PAID → CANCELLED` refund edge — that table
  belongs to wave B (I6); the payment section fixed here no longer
  contradicts the code.
- `AdminOrderDetail.payment` now exposes `providerPaymentIntentId` to the
  admin server component (needed for the shared page gate); it is never
  rendered. If a stricter boundary is wanted, narrow the page call to a
  pick-type later.
- Success page has no automated component test (server component, no
  harness); the refunded branch is covered by typecheck + the shared
  payment-status contract tests. A render-level test is a follow-up.
- Remote-DB 5 s-timeout flakes remain (`testTimeout` defaults); CI's local
  Postgres + `--no-file-parallelism` is the documented mitigation
  (retro I8).

---

# Retro Batch 2 Fix Report — Wave B (I4, I5)

Scope: ONLY Important items I4 / I5 from `retro-batch2.md`. Untouched:
I1–I3, I6–I9, all minors, all carried-over/deferred items. No free-order
completion path (parked follow-up, explicitly not built). No Task 12
customer-cancel change, no increment-on-webhook. Pre-existing dirty files
(`skills-lock.json`, `.agents/`) were not touched and not staged.

## What changed

### I4 — Zero-total coupons are rejected before anything is written
- `features/checkout/server/create-pending-order.ts`: after the quote (and
  the unknown-code check) but **before** `incrementCouponUsage` /
  `reserveVariantStock`, a discounted quote with `totalCents === 0` throws
  `CouponError("This coupon covers the full order; a minimum of $0.01 must
  remain")`. No order, payment, reservation, or coupon increment is written;
  the transaction never starts writing. Gated on `quote.couponCode` so a
  hypothetical non-coupon $0 cart keeps its old path.
- `features/checkout/components/ReviewStep.tsx`: submit is disabled when
  `quote.totalCents === 0`, with an amber `role="alert"` note ("This coupon
  covers the full order … at least $0.01 remains") telling the shopper to
  change/remove the coupon. No other checkout path changed:
  `create-checkout-session.ts` $0 refusal and `actions.ts` order-then-session
  ordering are untouched (the order can no longer exist).
- Tests: the old `create-pending-order.test.ts` zero-total test (which
  asserted the dead order IS created) now asserts rejection + zero rows
  (order/item/payment/reservation counts 0, `usedCount` unchanged,
  `reserved` unchanged); added a 100%-percent twin. New
  `ReviewStep.test.tsx`: $0 submit disabled + note shown + `onSubmit` not
  called; $0.01 total still submits.

### I5 — `usedCount` coherent on expiry + operator lever + documented policy
- `features/inventory/server/release-expired-reservations.ts`: when this
  invocation actually cancels the order (`orderUpdated.count === 1`), one use
  is returned via the conditional-SQL-under-row-lock precedent
  (`usedCount - 1` where `code = <order snapshot>` and `usedCount > 0`, by
  the same code-string snapshot the refund path uses). Already-cancelled
  orders (customer cancel, prior run) keep their use — the decrement only
  runs on a real `PENDING → CANCELLED` transition here. Deleted coupons match
  zero rows and never fail cleanup. Doc comment updated.
- `features/coupons/schemas.ts` + `features/coupons/server/actions.ts`: new
  `setCouponUsageAction` (`setCouponUsageSchema`: `couponId` + integer
  `usedCount ≥ 0`), `requireAdmin` first, `P2025 → "Coupon not found."`,
  generic outage fallback, `revalidatePath("/admin/coupons")`. No audit row
  or reason recorded (minimal by decision).
- `app/(admin)/admin/coupons/coupon-forms.tsx` + `page.tsx`: per-row
  `SetCouponUsageForm` (exact value, defaults to current) and one-click
  `ResetCouponUsageForm` (sets 0) in the Uses cell; the Coupons card help
  text now documents the policy: uses count checkouts created (increment at
  order creation; kept on customer cancel; returned on expiry + admin
  refund) and points at Set/Reset. No lifecycle-doc change (I6 owns it).

### Tests (TDD: written failing first, RED confirmed pre-fix)
- RED: `actions.test.ts` 6 new tests failed (`setCouponUsageAction is not a
  function`); `ReviewStep.test.tsx` 2 failed (no guard: enabled submit, no
  alert). DB zero-total/expiry assertions are inversions of previously-green
  old-behavior assertions (the replaced clamp test passed asserting order
  creation), so they fail pre-fix by construction.
- GREEN post-fix: same files pass; focused suites below all green.

## Tests run + output
- `vitest run actions.test.ts ReviewStep.test.tsx CheckoutForm.test.tsx` →
  3 files, 20 passed.
- `vitest run --no-file-parallelism create-pending-order.test.ts
  release-expired-reservations.test.ts` → 33 passed, 1 failed: pre-existing
  concurrency test 5 s-timeout flake (remote-DB latency, untouched by this
  wave). Re-run with `--testTimeout=60000` → that test green.
- `vitest run --no-file-parallelism admin-refund.test.ts coupon-service.test.ts
  actions.test.ts checkout/actions.test.ts` → 4 files, 64 passed (refund
  regression clean).
- `npx tsc --noEmit` → clean (0 errors).
- Full `npx vitest run --no-file-parallelism` → 421 passed, 2 failed, both in
  `release-expired-reservations.test.ts`: (1) the concurrency 5 s-timeout,
  (2) a `beforeEach` FK cascade in the next test caused by the timed-out
  test's orphaned in-flight writes. Proven infra, not logic: re-run of that
  file with `--testTimeout=60000` → 14/14 passed. All other 37 files green.

## Files (committed)
- `features/checkout/server/create-pending-order.ts`,
  `features/checkout/server/create-pending-order.test.ts`
- `features/checkout/components/ReviewStep.tsx`,
  `features/checkout/components/__tests__/ReviewStep.test.tsx` (new)
- `features/inventory/server/release-expired-reservations.ts`,
  `features/inventory/server/release-expired-reservations.test.ts`
- `features/coupons/schemas.ts`, `features/coupons/server/actions.ts`,
  `features/coupons/server/actions.test.ts`
- `app/(admin)/admin/coupons/page.tsx`,
  `app/(admin)/admin/coupons/coupon-forms.tsx`
- this report

## Concerns / follow-ups (not fixed, by instruction)
- Non-coupon $0 carts (if ever constructible) still fail later at
  `createCheckoutSession` with `CheckoutSessionError`; only the coupon path
  got the early specific error. Fine unless free SKUs exist.
- `usedCount` adjustments write no audit row; a misuse investigation would
  rely on before/after values only. Accepted per "keep minimal".
- `setCouponUsageAction` does not clamp `usedCount ≤ maxUses`; an operator
  can set an inconsistent pair. Validation was out of scope.
- Remote-DB 5 s-timeout flakes persist for DB suites (same class Wave A
  reported); CI local Postgres + `--no-file-parallelism` remains the
  mitigation (retro I8).
