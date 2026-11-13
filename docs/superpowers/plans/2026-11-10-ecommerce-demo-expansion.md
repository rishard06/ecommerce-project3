# Ecommerce Demo Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current DummyJSON-backed shop into a portfolio-ready simulated full-stack demo with 4-step checkout, account area, and DB-backed catalog/orders.

**Architecture:** Expand Prisma with Product/Address/Review + enriched Order, seed from DummyJSON once, then make DB the price truth. Checkout becomes a URL-driven wizard with server actions that simulate payment. Account pages read/write via session-scoped actions.

**Tech Stack:** Next.js 15 App Router, React 19 Server Components, Prisma 6 + PostgreSQL, Better-Auth, Zustand 5, Zod 3, Vitest 5, Tailwind v4 + shadcn/ui

**Spec:** Conversation 2026-11-10 approved design — simulated full-stack demo (no real money), checkout wizard + account profile/addresses/settings, keep full essentials list scoped for demo/portfolio.

## Global Constraints

- TypeScript strict mode, `@/*` import alias, no hardcoded colors (use design tokens).
- Server Components by default, `"use client"` only for hooks/events/browser APIs.
- All prices/totals validated server-side; never trust client total.
- Simulated payments only — no real Stripe keys, no external email/shipping APIs.
- Zod validation for all server actions.
- Tests with Vitest before implementation (TDD).

## Review Focus

- Empty cart checkout via direct URL `/checkout` should redirect to `/cart` with message, not crash.
- Quantity 0, negative, or >99 should be rejected with clear error, not create order.
- Unauthenticated access to `/account/*` and `/checkout/success?id=other-user-order` should redirect to `/login`.
- Invalid coupon code should keep totals unchanged and show error, not zero total.
- Deleted/unknown product ID in cart should fail validation gracefully with which ID failed.

---

### Task 1: DB foundation + seed

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Modify: `package.json` (add `prisma.seed` + `tsx` dev dep if missing)
- Test: `lib/__tests__/order-model.test.ts`

**Interfaces:**
- Consumes: existing `User`, `Order`, `OrderItem` in `prisma/schema.prisma:17-93`
- Produces:
  - `enum OrderStatus { PENDING, PAID, SHIPPED, CANCELLED }`
  - `model Product { id Int @id, title String, price Float, thumbnail String, stock Int, category String, brand String?, sku String? }`
  - `model Address { id String @id @default(uuid()), userId String, firstName String, lastName String, address String, city String, postalCode String, country String, isDefault Boolean @default(false) }`
  - `model Review { id String @id @default(uuid()), productId Int, userId String, rating Int, comment String, createdAt DateTime @default(now()) }`
  - `Order { userId String?, status OrderStatus @default(PAID), subtotal Float, shipping Float, tax Float, totalAmount Float, shippingAddress Json?, paymentMethod String @default("card_test"), coupon String? }`

- [ ] **Step 1: Write failing test for order math shape**

```ts
// lib/__tests__/order-model.test.ts
import { describe, it, expect } from "vitest";
import { getOrderTotals } from "@/lib/pricing";
describe("order totals demo", () => {
  it("adds shipping + tax + coupon", () => {
    expect(getOrderTotals(100, "standard", "DEMO10").total).toBeCloseTo(98.5);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- lib/__tests__/order-model.test.ts`
Expected: FAIL — `getOrderTotals` takes 1 arg, coupon/shipping missing

- [ ] **Step 3: Implement Prisma schema expansion in `prisma/schema.prisma`**

Add `OrderStatus`, `Product`, `Address`, `Review`, extend `Order`/`OrderItem` with fields above, add `User addresses Address[]`, `orders Order[]`.

- [ ] **Step 4: Add `prisma/seed.ts` fetching top 60 DummyJSON products into `Product`**

Use `fetch("https://dummyjson.com/products?limit=60")`, upsert by `id`.

- [ ] **Step 5: Run migration + seed + tests**

Run: `npx prisma migrate dev --name demo_expansion && npx prisma db seed && npm test -- lib/__tests__/order-model.test.ts`
Expected: migration PASS, but totals test still FAIL (drives Task 2)

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/seed.ts package.json lib/__tests__/order-model.test.ts
git commit -m "feat: expand prisma for demo store with seed"
```

### Task 2: Pricing truth (DB-backed)

**Files:**
- Modify: `lib/pricing.ts:8-27`
- Modify: `lib/price-validation.ts:28-98`
- Test: `lib/__tests__/price-validation.test.ts` (extend), `lib/__tests__/pricing.test.ts`

**Interfaces:**
- Consumes: `Product` from Task 1
- Produces:
  - `getOrderTotals(subtotal: number, shippingMethod?: "standard"|"express"|"pickup", coupon?: string) -> OrderTotals`
  - `SHIPPING_RATES = { standard: 4.99, express: 12.99, pickup: 0 }`
  - `COUPONS = { DEMO10: 0.10 }`
  - `validateCartPrices(items: CartItemInput[]) -> PriceValidationResult` (DB lookup, stock check, qty 1..99)

- [ ] **Step 1: Write failing tests for shipping + coupon + stock**

```ts
it("rejects qty 0 and unknown product", async () => {
  const r = await validateCartPrices([{ id: 999999, quantity: 1 }]);
  expect(r.success).toBe(false);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- lib/__tests__/price-validation.test.ts`
Expected: FAIL — still hits DummyJSON per-item, no stock check

- [ ] **Step 3: Implement `getOrderTotals` with shipping + coupon in `lib/pricing.ts`**

`shipping = SHIPPING_RATES[method]`, `discount = COUPONS[coupon] ? subtotal*rate : 0`, `tax = (subtotal-discount)*0.015`, `total = subtotal-discount+shipping+tax`. Free standard shipping over 75.

- [ ] **Step 4: Rewrite `validateCartPrices` to query `prisma.product.findMany`**

Batch fetch, check missing IDs, check `quantity <1 or >99`, check `stock`, return `validatedItems` with DB price/title.

- [ ] **Step 5: Run tests**

Run: `npm test -- lib/__tests__/pricing.test.ts lib/__tests__/price-validation.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/pricing.ts lib/price-validation.ts lib/__tests__/pricing.test.ts
git commit -m "feat: db-backed pricing with shipping and demo coupon"
```

### Task 3: Checkout wizard (4 steps, test mode)

**Files:**
- Modify: `app/(shop)/checkout/page.tsx:1-50`
- Modify: `features/checkout/types.ts:1-18`
- Modify: `features/checkout/components/CheckoutForm.tsx:1-400`
- Create: `features/checkout/components/CheckoutSteps.tsx`, `ShippingStep.tsx`, `PaymentStep.tsx`, `ReviewStep.tsx`
- Create: `app/(shop)/checkout/success/page.tsx`
- Test: `features/checkout/__tests__/checkout-flow.test.tsx`

**Interfaces:**
- Consumes: `getOrderTotals`, `createOrderAction` (Task 4), `useCartStore`
- Produces:
  - `CheckoutSteps({ step: 1|2|3|4 })`
  - `ShippingStep({ value: ShippingAddress & { method, addressId? }, onNext })`
  - Wizard URL: `/checkout?step=shipping|payment|review`, guard empty cart -> `/cart`

- [ ] **Step 1: Write failing component test for step guard**

```tsx
it("redirects to cart when empty", () => {
  render(<CheckoutForm items={[]} />);
  expect(screen.getByText(/cart is empty/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- features/checkout/__tests__/checkout-flow.test.tsx`
Expected: FAIL — no guard, single-page form

- [ ] **Step 3: Implement `CheckoutSteps` progress + refactor `CheckoutForm` into wizard**

Split existing `CheckoutForm.tsx:119-352` into steps, keep styling, add fake card fields with `4242...` prefill + `TEST MODE` badge, coupon input, shipping method radio.

- [ ] **Step 4: Add `success/page.tsx` fetching order by id, clear cart on mount**

Show order number, totals breakdown, link to `/account/orders/[id]`.

- [ ] **Step 5: Run tests + manual dev check**

Run: `npm test -- features/checkout/__tests__/checkout-flow.test.tsx && npm run dev`
Expected: PASS, wizard navigates, success renders

- [ ] **Step 6: Commit**

```bash
git add app/\(shop\)/checkout features/checkout
git commit -m "feat: 4-step simulated checkout wizard"
```

### Task 4: Orders + addresses server actions

**Files:**
- Modify: `features/checkout/actions.ts:17-67`
- Modify: `app/api/orders/route.ts:5-53`
- Create: `features/account/actions.ts`
- Test: `features/checkout/__tests__/actions.test.ts`

**Interfaces:**
- Consumes: `validateCartPrices`, `auth()` session, `Address`
- Produces:
  - `createOrderAction(input: { addressId?: string, shipping: ShippingAddress, method: string, payment: { cardLast4: string }, coupon?: string, items: CartItemInput[] }) -> { success, orderId?, total? }`
  - `getMyOrders(userId: string)`, `getOrderDetail(userId: string, orderId: string)`
  - `saveAddress(userId: string, data: AddressInput)`, `listAddresses(userId: string)`

- [ ] **Step 1: Write failing action test with Zod + auth**

```ts
it("rejects invalid postal + qty 0", async () => {
  const r = await createOrderAction({ ...badInput });
  expect(r.success).toBe(false);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- features/checkout/__tests__/actions.test.ts`
Expected: FAIL — old signature `(shippingInfo, paymentMethod, items)`

- [ ] **Step 3: Implement new `createOrderAction` in `features/checkout/actions.ts`**

Validate shipping Zod, validate prices via Task 2, simulate 1.2s delay, `prisma.order.create` with `userId` from session (nullable for demo guest), `status: PAID`, snapshot titles/prices.

- [ ] **Step 4: Update `app/api/orders/route.ts` to require Zod, rate-limit basic, idempotency via `coupon+items` hash**

Keep POST, add GET for `?mine=1` returning session orders.

- [ ] **Step 5: Run tests**

Run: `npm test -- features/checkout/__tests__/actions.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add features/checkout/actions.ts features/account/actions.ts app/api/orders/route.ts
git commit -m "feat: session-scoped orders and addresses actions"
```

### Task 5: Account area

**Files:**
- Create: `app/(shop)/account/layout.tsx`, `page.tsx`, `profile/page.tsx`, `orders/page.tsx`, `orders/[id]/page.tsx`, `addresses/page.tsx`, `settings/page.tsx`
- Create: `features/account/components/AccountNav.tsx`, `AddressForm.tsx`, `ProfileForm.tsx`
- Test: `features/account/__tests__/account.test.tsx`

**Interfaces:**
- Consumes: `getMyOrders`, `listAddresses`, `auth-client.ts` session
- Produces: `/account` dashboard with nav, order history list, address CRUD

- [ ] **Step 1: Write failing test for auth guard**

```tsx
it("shows login prompt when unauthenticated", () => {
  render(<AccountNav user={null} />);
  expect(screen.getByText(/sign in/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- features/account/__tests__/account.test.tsx`
Expected: FAIL — files missing

- [ ] **Step 3: Implement account layout + pages**

Server Components, `auth()` check, redirect to `/login?next=/account` if null. Profile edits `name/image`, settings shows session + logout + password change link.

- [ ] **Step 4: Run tests**

Run: `npm test -- features/account/__tests__/account.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/\(shop\)/account features/account
git commit -m "feat: account dashboard with orders and addresses"
```

### Task 6: Auth completeness + catalog upgrade

**Files:**
- Create: `app/(auth)/register/page.tsx`, `features/auth/components/RegisterForm.tsx`
- Modify: `app/(shop)/products/page.tsx:1-145`, `features/products/components/CategorySidebar.tsx`
- Create: `app/(shop)/search/page.tsx`
- Test: `features/auth/__tests__/register.test.tsx`, `features/products/__tests__/search.test.ts`

**Interfaces:**
- Consumes: `better-auth` `signUp.email`, `getProducts`
- Produces: `RegisterForm()`, `/search?q=&sort=price-asc|rating&category=` reading from DB with fallback to DummyJSON

- [ ] **Step 1: Write failing search + register tests**

```ts
it("filters by query and sorts", async () => {
  expect(await searchProducts({ q: "phone", sort: "price-asc" })).toBeSorted();
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- features/auth/__tests__/register.test.tsx features/products/__tests__/search.test.ts`
Expected: FAIL — missing

- [ ] **Step 3: Implement register + search**

Register via `auth-client.signUp.email`, search via Prisma `contains` on title/category, sort, keep pagination `skip/limit`.

- [ ] **Step 4: Run tests**

Run: `npm test -- features/auth features/products/__tests__/search.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/\(auth\)/register app/\(shop\)/search features/auth features/products
git commit -m "feat: register and db search sort filter"
```

### Task 7: Reviews, favorites, trust pages

**Files:**
- Create: `features/products/components/ReviewList.tsx`, `ReviewForm.tsx`, `features/products/actions.ts`
- Create: `app/(shop)/terms/page.tsx`, `privacy/page.tsx`, `shipping/page.tsx`, `returns/page.tsx`, `faq/page.tsx`, `contact/page.tsx`
- Modify: `components/layout/Footer.tsx`, `app/layout.tsx` (metadata)
- Test: `features/products/__tests__/reviews.test.ts`

**Interfaces:**
- Produces: `submitReview(productId: number, rating: 1-5, comment: string)`, static legal pages

- [ ] **Step 1: Write failing review test**

```ts
it("rejects rating 6", async () => {
  await expect(submitReview(1, 6, "x")).rejects.toThrow();
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- features/products/__tests__/reviews.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement reviews + legal pages + footer links + JSON-LD**

- [ ] **Step 4: Run tests**

Run: `npm test -- features/products/__tests__/reviews.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add features/products app/\(shop\)/terms app/\(shop\)/privacy app/\(shop\)/shipping app/\(shop\)/returns
git commit -m "feat: reviews and trust pages"
```

## Self-Review

- Spec coverage: checkout wizard, account profile/addresses/settings, DB truth, search/filter, reviews, legal/SEO all have tasks. Email real-send intentionally omitted (simulated).
- Step scan: each step is one action with command + expected output.
- Type consistency: `CartItemInput {id, quantity}`, `OrderTotals {subtotal, shipping, tax, total}`, `ShippingAddress` extended with method only in wizard props to avoid breaking `actions.ts`.
- Review Focus tests pinned to Tasks 2-5.
- Proportion: plan is decision list, not code transcript; bodies left to implementer.
