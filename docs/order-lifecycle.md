# Order Lifecycle

How an order moves through checkout, payment, fulfillment, and reservation
cleanup. This document mirrors the code in:

- `prisma/schema.prisma` — enums and models
- `features/checkout/server/create-pending-order.ts`
- `features/payments/server/create-checkout-session.ts`
- `features/payments/server/process-stripe-event.ts`
- `features/payments/server/payment-transitions.ts`
- `features/orders/server/admin-order-service.ts`
- `features/orders/server/customer-order-service.ts`
- `features/orders/server/return-decisions.ts` (approve/reject; re-exported by `admin-order-service.ts`)
- `features/returns/server/actions.ts` (`requestReturn`, `getReturnRequestForViewer`)
- `features/returns/server/return-actions.ts` (`requestReturnAction` FormData wrapper)
- `features/invoices/server/render-invoice.ts` (snapshot-only invoice data)
- `lib/email/send-fulfillment-email.ts` (SHIPPED/DELIVERED notifications)
- `features/inventory/server/release-expired-reservations.ts`
- `app/api/webhooks/stripe/route.ts`
- `app/api/cron/release-reservations/route.ts`

All money is an integer number of USD cents. The order stores immutable
snapshots of line items, prices, totals, shipping, and any coupon discount;
later catalog edits do not rewrite existing orders. Tax is 1.5% of the subtotal
rounded to cents, shipping is 0, and the total is `subtotal + tax + shipping`
(`lib/pricing.ts`). When a coupon is applied, tax is computed on
`subtotal − discount` and the total is `subtotal − discount + tax + shipping`;
the `discountCents`/`couponCode` snapshot is stored on the order
(`features/cart/server/quote-cart.ts`).

---

## 1. The four state machines

These are independent on purpose. A payment webhook never advances
fulfillment, and an admin fulfillment change never touches payment truth.

### OrderStatus (`Order.status`)

| Value | Meaning |
| --- | --- |
| `PENDING` | Created at checkout; stock is reserved; awaiting a signed payment result or expiry. |
| `PAID` | A signed Stripe webhook confirmed payment and stock was committed. Refundable in full by an admin (→ `CANCELLED`). |
| `CANCELLED` | Terminal. Reached from `PENDING` when no money moved (checkout expired, reservation reclaimed, or the customer cancelled) or from `PAID` via an admin refund (money returned; `Payment.status` reads `REFUNDED`). |

Allowed transitions:

```text
PENDING ──(checkout.session.completed + paid)──▶ PAID
PENDING ──(checkout.session.expired)───────────▶ CANCELLED
PENDING ──(cleanup after reservation TTL)──────▶ CANCELLED
PENDING ──(customer cancel, UNFULFILLED only)──▶ CANCELLED
PAID ──(admin full refund)─────────────────────▶ CANCELLED
```

`CANCELLED` is terminal for the implemented services: fulfillment changes on
a cancelled order are rejected, an already-cancelled order is a no-op for
refunds, and a second cancel is rejected. Every write is conditional on the
status observed inside the transaction, so a late or duplicate webhook cannot
resurrect a cancelled order.

### PaymentStatus (`Payment.status`)

| Value | Meaning |
| --- | --- |
| `PENDING` | Payment row created with the order. |
| `SUCCEEDED` | Signed webhook reported a paid session; stock committed. |
| `CANCELLED` | The checkout expired or the hold was reclaimed. No money moved. |
| `REFUNDED` | An admin refund reversed a `SUCCEEDED` payment in full via Stripe. |
| `FAILED` | Declared in the schema; no current code path writes it (reserved for future reconciliation/manual use). |

```text
PENDING ──(paid webhook)──▶ SUCCEEDED
PENDING ──(expired/cleanup)▶ CANCELLED
SUCCEEDED ──(admin refund)──▶ REFUNDED
```

A payment never goes `SUCCEEDED → CANCELLED`: expiry and cleanup only touch
`PENDING` rows, and the admin refund writes `SUCCEEDED → REFUNDED` instead.
`CANCELLED` therefore always means “never paid”, while a refunded payment
reads `REFUNDED` on every surface (admin list/detail badges, the customer
success page). The refund is derived from `Payment.status`, not from the
`ORDER_REFUNDED` audit row: the refund transaction writes both atomically, and
the payment row is what all read paths already select. The Stripe webhook only
ever marks `PENDING → SUCCEEDED`; it never overwrites `REFUNDED`.

### ReturnStatus (`ReturnRequest.status`)

| Value | Meaning |
| --- | --- |
| `PENDING` | Customer asked for a return; awaiting an admin decision. No money moved. |
| `APPROVED` | Admin approved; the approve path refunds the Stripe payment in full and cancels the order. Terminal. |
| `REJECTED` | Admin rejected; no money moves, order and payment unchanged. Terminal. |

```text
PENDING ──(admin approve + refund)──▶ APPROVED
PENDING ──(admin reject, no money)──▶ REJECTED
```

Rules (enforced in `features/returns/server/actions.ts` and
`features/orders/server/admin-order-service.ts`):

- One request per order (`ReturnRequest.orderId` is `@unique`). A second
  request throws `DuplicateReturnError`; concurrent double-submits resolve
  deterministically via the unique constraint (`P2002` → duplicate).
- Only `PAID` + `DELIVERED` orders may be requested. `PAID` keeps the approve
  path honest (approving triggers `refundPayment`, which only refunds
  succeeded Stripe payments, so a request must never exist on an order with
  no captured money).
- Only deliveries within the last 30 days (`RETURN_WINDOW_DAYS = 30`),
  anchored on `Order.updatedAt` (there is no `deliveredAt` column; the
  `DELIVERED` transition bumps `updatedAt`). Limitation: any later write to
  the order row re-opens the window.
- The customer surface is the "Returns" section on `/orders/[id]`
  (also `/account/orders/[id]`, same page): a status block (`PENDING` /
  `APPROVED` / `REJECTED` + reason + request date) whenever a request exists,
  plus a `requestReturnAction(formData)` reason form shown only for `PAID` +
  `DELIVERED` orders with no request. Guests use the same page with
  `?token=`.
- The admin surface is `/admin/orders` (a `Return` column from
  `returnRequest.status`: pending / approved / rejected, `—` when none) and
  the approve/reject forms on `/admin/orders/[id]`.
- Approve flow: the `PENDING → APPROVED` claim is conditional
  (`updateMany` on observed `PENDING`), so exactly one concurrent approver
  wins; losers and later calls return `{ approved: false }` without touching
  Stripe. The claim commits **before** `refundPayment` runs, which is what
  unlocks the `DELIVERED` refund gate. The refund then writes
  `ORDER_REFUNDED`, moves payment `SUCCEEDED → REFUNDED`, and moves the order
  to `CANCELLED`/`CANCELLED` (stock restocked, one coupon use returned).
  Resume rule: an `APPROVED` request whose order is still `PAID` means a
  previous approve died between claim and refund, so approving again resumes
  the refund under the same `refund-{orderId}` idempotency key (never a
  second Stripe charge); only an order that already left `PAID` is a true
  no-op. Refund failures propagate to the admin action — the page must derive
  "refund pending / failed" from order/payment state, and the generic Refund
  card remains the retry path for `APPROVED` + `PAID`.
- Reject flow: `PENDING → REJECTED` via a conditional claim; no Stripe call,
  no order/payment/stock change, just the `REJECTED` status plus one audit
  row. Later decisions are no-ops returning the current status
  (approve-after-reject and reject-after-approve never move money).
- Audits: `RETURN_REQUESTED` (customer request; `fromStatus`/`toStatus` null,
  actor is the user id or `NULL` for a guest token), `RETURN_APPROVED` and
  `RETURN_REJECTED` (admin decision; statuses null — the order row itself is
  unchanged by the decision, the refund writes its own `ORDER_REFUNDED` row).

### ReservationStatus (`Reservation.status`)

| Value | Meaning |
| --- | --- |
| `ACTIVE` | Stock is held (`ProductVariant.reserved` includes this quantity) until `expiresAt`. |
| `COMMITTED` | Payment succeeded; the hold became a sale (`onHand` and `reserved` both decreased). |
| `RELEASED` | Hold expired or checkout was cancelled; only `reserved` was decreased. |

```text
ACTIVE ──(paid webhook)────────▶ COMMITTED
ACTIVE ──(expired/cleanup)─────▶ RELEASED
```

Both terminal states are reached through conditional `UPDATE ... WHERE
status = 'ACTIVE'` claims. A reservation can transition exactly once, which is
what makes webhook replays and concurrent cleanup runs idempotent.

### FulfillmentStatus (`Order.fulfillmentStatus`)

| Value | Meaning |
| --- | --- |
| `UNFULFILLED` | Default at order creation; nothing shipped. |
| `PROCESSING` | Admin started fulfillment. |
| `SHIPPED` | Admin marked the order shipped. |
| `DELIVERED` | Terminal success state. |
| `CANCELLED` | Terminal fulfillment branch. |

Allowed transitions (`features/orders/server/admin-order-service.ts`):

| From | Allowed next |
| --- | --- |
| `UNFULFILLED` | `PROCESSING`, `CANCELLED` |
| `PROCESSING` | `SHIPPED`, `CANCELLED` |
| `SHIPPED` | `DELIVERED` |
| `DELIVERED` | — (terminal) |
| `CANCELLED` | — (terminal) |

Fulfillment cancellation is a separate branch, not a step in the linear
sequence. It does **not** cancel the order, cancel the payment, refund Stripe,
or release reservations; those are payment/order concerns. A `PAID` order whose
fulfillment was cancelled before shipment is still refundable in-app (see
Step 9); conversely, the refund transaction itself lands fulfillment on
`CANCELLED` as part of voiding the order. The transition is
applied only when the row still has the status observed inside the transaction,
and every successful change writes an `OrderAuditLog` entry with
`action = "FULFILLMENT_UPDATED"`, the actor id from the admin session, and the
`fromStatus`/`toStatus` pair.

The service does not require the order to be `PAID` before fulfillment
changes; it only enforces the fulfillment state machine. Business policy for
shipping unpaid orders belongs to the operator.

---

## 2. End-to-end walkthrough

### Step 1 — Checkout creates a pending order and holds stock

`createPendingOrder` runs one transaction:

1. If `(userId, idempotencyKey)` already exists, return that order and touch
   nothing else.
2. Quote the cart from PostgreSQL (`quoteCart`); browser prices and titles are
   ignored.
3. Reserve every line with a conditional update:
   `onHand - reserved >= quantity` → `reserved += quantity`. A shortfall throws
   `InsufficientStockError` and rolls back earlier lines.
4. Create the `Order` (`PENDING`, `UNFULFILLED`), immutable `OrderItem`
   snapshots, one `Payment` (`PENDING`, amount = order total), and one
   `Reservation` per line (`ACTIVE`, `expiresAt = now + 30 minutes`).

When a coupon code is supplied, it is validated against the database quote and
its use is incremented (`Coupon.usedCount + 1`) in the same transaction; the
order snapshots `discountCents`/`couponCode`. A coupon that would price the
order to $0 is rejected with a `CouponError` before anything is written, so no
dead pending order, reservation, or coupon use is created
(`features/checkout/server/create-pending-order.ts`).

The idempotency key is unique per user (`Order_userId_idempotencyKey_key`).
A concurrent duplicate either loses the unique constraint or runs out of stock;
both paths re-read the winner's order and return it, so one submit equals one
order and one reservation.

### Step 2 — Hosted Stripe Checkout

`createCheckoutSession` refuses to start unless the order is `PENDING`, has
items, has a `PENDING` payment, and `payment.amountCents === order.totalCents`.
It builds line items from the snapshots (plus separate tax/shipping lines) and
refuses to proceed if the line-item sum differs from the order total. The
session carries `metadata.orderId` (also on the PaymentIntent).
`providerSessionId` is stored on the payment row.

The success redirect (`/checkout/success?orderId=...`) only displays current
database state. **It never marks an order paid.**

### Step 3 — Webhook confirms payment

`POST /api/webhooks/stripe`:

1. Requires a `stripe-signature` header (otherwise `400`).
2. Reads the exact raw body and verifies it with `STRIPE_WEBHOOK_SECRET`
   (invalid signature → `400`, no payment/stock logic runs).
3. Passes the event to `processStripeEvent`, which opens one transaction:
   - Inserts a `WebhookEvent` keyed by the unique `providerEventId`.
   - Applies only `checkout.session.completed` / `checkout.session.expired`.
   - Marks the event `processedAt`.
4. Returns `200 {"received":true}`. Processing failures return `500` so Stripe
   retries.

For `checkout.session.completed`:

- Requires `metadata.orderId`; a missing value is logged and ignored.
- Requires `payment_status` to be `paid` or `no_payment_required`. A completed
  session that is still unpaid does nothing.
- `markCheckoutPaid` claims each `ACTIVE` reservation as `COMMITTED`, then
  guarded raw updates decrement `onHand` and `reserved` together. If stock no
  longer satisfies the guard, the transaction rolls back and Stripe retries.
- The `PENDING` payment becomes `SUCCEEDED` (session id stored if absent) and
  the `PENDING` order becomes `PAID`. Fulfillment stays `UNFULFILLED`.
- If the payment is already `SUCCEEDED`, the call is a no-op; any other payment
  status (notably `CANCELLED`) is never overwritten with success.

### Step 4 — Duplicate/replayed webhooks

The `WebhookEvent.providerEventId` unique constraint is the replay guard.
Because the event row and all payment/stock effects commit in the same
transaction:

- A duplicate delivery hits the constraint, the attempt rolls back, and the
  handler returns `200` as a successful no-op.
- Stock is committed exactly once.
- A concurrent duplicate behaves the same way: one transaction wins, the other
  observes the existing event and acknowledges.

Replay with the Stripe CLI (see `docs/production-setup.md` §6.4):

```bash
stripe events resend evt_xxxxxxxxxxxxx --webhook-endpoint we_xxxxxxxxxxxxx
```

### Step 5 — Customer order history

`listOrdersForUser(userId)` and `getOrderForUser(orderId, userId)` put ownership
in the SQL predicate (`where: { userId }` / `where: { id, userId }`). Another
customer's id is indistinguishable from a missing one (`null` → 404). Guests
read their own orders by unguessable token (`getOrderForViewer`). Pages call
`requireUser()` first; anonymous visitors are redirected to `/login`.
Customers can only cancel their own orders, and only while the order is still
`PENDING` + `UNFULFILLED` (see Step 8); paid, shipped, delivered, or
already-cancelled orders are rejected untouched. Customers never mark an order
paid — only a signed Stripe webhook does that.

### Step 6 — Admin fulfillment

Admin pages (`/admin/orders`, `/admin/orders/[id]`) are protected twice: the
route-group layout and each page call `requireAdmin()`. `updateFulfillmentAction`
runs the same guard before parsing input and takes the actor id from the
session, never from the form. `updateFulfillment` applies only the transitions
in §1 and records the audit entry in the same transaction. Non-admins get a
404 from the layout; anonymous users are redirected to login. Issuing a refund
is also an admin action (see Step 9): it is full-only and writes
`ORDER_REFUNDED`, returns one coupon use, and restocks.

### Step 7 — Expiry and cleanup

Two independent paths release an unpaid hold:

**Explicit expiry:** `checkout.session.expired` → `releaseCheckout` claims each
`ACTIVE` reservation as `RELEASED`, decrements only `reserved`, sets a
`PENDING` payment/order to `CANCELLED`. Paid or already-cancelled orders are
no-ops.

**Scheduled cleanup:** Vercel calls
`GET /api/cron/release-reservations` every five minutes with
`Authorization: Bearer $CRON_SECRET`. `releaseExpiredReservations`:

1. Selects up to 100 `ACTIVE` reservations with `expiresAt <= now`, ordered by
   expiry then id.
2. Skips reservations belonging to `PAID` orders.
3. Processes each order in its own transaction (deterministic lock order):
   re-checks the order is not paid, claims each reservation `ACTIVE →
   RELEASED`, and decrements `reserved` under a `reserved >= quantity` guard.
4. Cancels the payment/order only when no other `ACTIVE` reservation remains —
   an order with an unexpired hold still has a live checkout and stays
   `PENDING`.

`onHand` is never changed by release because nothing was sold. The conditional
claim and guards make concurrent/repeated runs safe: a second run releases
nothing and returns `{"released":0}`.

When this cleanup actually cancels an order, it returns one coupon use
(`Coupon.usedCount − 1`, guarded `usedCount > 0`, matched by the order's
`couponCode` snapshot): an abandoned cart must not permanently burn a limited
coupon. A deleted coupon matches zero rows and never fails cleanup
(`features/inventory/server/release-expired-reservations.ts`).

### Step 8 — Customer cancel

`cancelOrder` (`features/orders/server/customer-order-service.ts`) cancels only
an order that is still `PENDING` + `UNFULFILLED` and owned by the caller
(session user id, or the guest token from the URL). In one transaction it claims
each `ACTIVE` reservation `ACTIVE → RELEASED` and decrements
`ProductVariant.reserved` (nothing was sold, so `onHand` is untouched), moves a
`PENDING` payment to `CANCELLED`, moves the order to
`CANCELLED`/`CANCELLED`, and writes an `ORDER_CANCELLED` audit row (actor is
the user id, or `null` for a guest cancelling with their token).

Anything else is rejected with no writes: paid, shipped, delivered, or
already-cancelled orders throw `OrderNotCancellableError`, and another
viewer's id throws `OrderNotFoundError`. If a reservation is already
`COMMITTED`, the payment webhook won the race and the cancel is refused instead
of corrupting sold stock. The coupon snapshot is preserved and `usedCount` is
never returned here — a self-service cancel keeps the use consumed as an abuse
guard; only expiry (Step 7) and admin refund (Step 9) return it.

### Step 9 — Admin refund (generic path + approved-return exception)

`refundPayment` (`features/orders/server/admin-order-service.ts`) refunds a
paid order in full and cancels it. Eligibility is one shared gate used by both
the service and the admin refund card (`refundBlockReason`/`canRefund`): the
order must be `PAID`, the payment must be a `SUCCEEDED` Stripe intent, and
fulfillment must be either unshipped (`UNFULFILLED`, `PROCESSING`, or
pre-shipment `CANCELLED` — cancelling fulfillment is only legal before
shipment, so that shape was never shipped) **or** `DELIVERED` with an
`APPROVED` return request (Task 15 approve path). `SHIPPED` orders and
`DELIVERED` orders without an approved return, non-Stripe payments, and
intent-less payments are refused; `REFUNDED` payments never re-pass.

Stripe is called first (`refunds.create` on the payment intent, full amount,
`idempotencyKey: refund-{orderId}`); then one transaction restocks (each
`ACTIVE` hold is released and `reserved` decremented; each `COMMITTED` hold had
its sale recorded by the webhook, so `onHand` is incremented instead), moves
the payment `SUCCEEDED → REFUNDED`, returns one coupon use (`usedCount − 1`,
floored at 0, by `couponCode` snapshot), moves the order to
`CANCELLED`/`CANCELLED`, and writes an `ORDER_REFUNDED` audit row
(`PAID → CANCELLED`). An already-cancelled order is an idempotent no-op that
never touches Stripe. See `docs/production-setup.md` §9 for the operator
procedure (restricted keys need `refunds:write`; dashboard refunds are not
synced back).

**Delivered + approved-return exception, and the generic card's retry role.**
The generic Refund card on `/admin/orders/[id]` renders from the same
`refundBlockReason` gate, so it keeps refusing `SHIPPED` orders and
`DELIVERED` orders without an approved return — that refusal is correct for
the generic path; only the approve flow refunds delivered orders. When an
approve claims `APPROVED` but its refund fails (order still `PAID`), the
approve/reject forms no longer apply (they only render for `PENDING`), so
the generic Refund card is the retry path: for `DELIVERED` + `APPROVED` +
`SUCCEEDED` payment the gate passes, and retrying reuses
`refund-{orderId}`. A resumed approve (`APPROVED` + still `PAID`) behaves
the same way.

Coupon `usedCount` policy, in one place: incremented when a checkout order is
created; kept on customer cancel; returned on expiry cleanup and on admin
refund; adjustable by an admin at any time via the Set/Reset usage controls on
`/admin/coupons` (`setCouponUsageAction`). `usedCount` therefore counts
checkouts created, not completed sales.

### Step 10 — Customer return request

`requestReturn` (`features/returns/server/actions.ts`) records a `PENDING`
`ReturnRequest` plus a `RETURN_REQUESTED` audit row in one transaction; money
is never touched here. Ownership uses the same viewer predicate as the order
page (session `userId`, or the unguessable `guestToken` from `?token=`), and
misses/foreign orders resolve to `OrderNotFoundError`. Eligibility:
`PAID` + `DELIVERED`, within 30 days of `updatedAt`, one request per order,
non-empty reason (≤ 1000 chars). The customer entry point is the
`requestReturnAction(formData)` wrapper
(`features/returns/server/return-actions.ts`) consumed by the "Returns"
section on `/orders/[id]` (status block + reason form; `/account/orders/[id]`
re-exports the same page). Admins triage via the `Return` column on
`/admin/orders` and decide on `/admin/orders/[id]` (`approveReturn` /
`rejectReturn`; see the `ReturnStatus` section for the claim-before-charge
flow, the resume rule, and the reject-no-money path). There is deliberately
no admin notification email for a new request — triage is via the list
column.

### Step 11 — Invoices (payment history, not order status)

Entitlement follows payment history: `canDownloadInvoice` shows the invoice
button and serves `/orders/[id]/invoice` whenever the payment reached
`SUCCEEDED` or `REFUNDED` (and the order is not `PENDING`). Every in-app
refund flips the order/fulfillment to `CANCELLED`, and a pre-shipment
fulfillment cancel does the same — neither erases the financial record, so
neither revokes the invoice. `PENDING` orders stay hidden even with a payment
row; `PENDING`/`CANCELLED`/`FAILED` payments and missing payments stay
hidden. Refunded invoices render a "Refunded" badge and a credit-note footer
("A full refund was issued …"); amounts are the Task 16 order snapshots and
never change with later catalog edits. Ownership reuses `getOrderForViewer`
(guests keep `?token=`).

### Step 12 — Shipment / delivery emails (best-effort, no refund email)

`sendFulfillmentEmail(orderId, "SHIPPED" | "DELIVERED")`
(`lib/email/send-fulfillment-email.ts`) fires after the fulfillment
transaction commits. It is best-effort and never throws: lookup + send are
guarded so an email failure cannot fail the admin action or roll back the
transition. The recipient is the order's user email (same lookup as the order
confirmation); **guest orders receive no shipment email** because they store
no email address (`userId` null — same limitation as the Task 2 confirmation
email). No refund or return-decision email is sent: refunds are a synchronous
Stripe API call (`refunds.create`), not a webhook, and return
approve/reject only flips `ReturnRequest.status` plus audit rows. Operators
must not expect a "refund webhook/email" — assert only confirmation, auth,
and shipment/delivery emails.

---

## 3. Webhook events and idempotency summary

| Event | Effect |
| --- | --- |
| `checkout.session.completed` | If signature valid, `metadata.orderId` known, and `payment_status` is `paid`/`no_payment_required`: commit reservations, decrement stock, payment → `SUCCEEDED`, order → `PAID`. |
| `checkout.session.expired` | Release active reservations, payment/order → `CANCELLED` (no stock sale). |
| Any other event type | Recorded in `WebhookEvent` only; no business effect. |

- **Signature:** verified over raw bytes with `STRIPE_WEBHOOK_SECRET`; invalid
  or missing → `400`.
- **Idempotency key:** `WebhookEvent.providerEventId` (unique).
- **Unknown order / missing `metadata.orderId`:** logged and ignored; event is
  still recorded and marked processed.
- **Failure:** returns `500` so Stripe retries; the transaction rolled back, so
  no partial stock/payment write survives.
- **Amount integrity:** enforced when the Checkout session is created — the
  payment amount must equal the order total, and the line-item sum must equal
  the order total, all from immutable snapshots. The webhook itself keys off
  `metadata.orderId` and Stripe's signed `payment_status`.

### Late payment after expiry

If payment succeeds after cleanup already released the hold, `markCheckoutPaid`
detects a `RELEASED` reservation and returns without marking the order paid
(the stock is gone). The event is recorded, but the order remains `PENDING`
with a `PENDING` payment. This is deliberate: the system must not sell stock
that was released. Handle it operationally (refund/void in Stripe, reconcile the
order manually) rather than editing payment state by hand.

To make the situation machine-visible, both late-payment paths emit a
secret-free `console.warn` containing the order id and write an `OrderAuditLog`
row with `actorId = NULL`:

| Situation | `OrderAuditLog.action` |
| --- | --- |
| Hold already `RELEASED`; order still `PENDING` | `PAYMENT_AFTER_RELEASE` |
| Order already `CANCELLED` when the paid event arrives | `PAYMENT_AFTER_CANCELLATION` |

The audit row's `fromStatus`/`toStatus` both echo the order status at the time
(`PENDING` or `CANCELLED`). Payment state and stock are never advanced on these
paths.

---

## 4. Ownership and trust boundaries

| Surface | Rule |
| --- | --- |
| Customer order pages/services | `requireUser()` at the page; every query filters by the session user id. Foreign ids return `null`/404. |
| Admin catalog and orders | `requireAdmin()` in the layout and in each page/action; role is loaded from `user.role` in PostgreSQL, never from client input. |
| Fulfillment | Admin-only action; actor id comes from the verified session; audit row written in the same transaction. |
| Checkout/order creation | User id comes from the session; prices/totals come from the database quote, never from the browser; idempotency key is bounded to 128 chars. |
| Stripe webhook | Authenticated by signature, not by a user session. |
| Cron cleanup | Authenticated by constant-time comparison of `Authorization: Bearer $CRON_SECRET`; failures return a generic message. |
| Catalog mutations | Admin-only server actions; products are archived (`ARCHIVED`), never hard-deleted, so order history keeps its snapshots. |

---

## 5. Operational queries

Inspect one order and its reservation/payment/audit state:

```sql
SELECT o.id, o.status, o."fulfillmentStatus", o."totalCents",
       p.status AS payment_status, p."providerSessionId",
       r.status AS reservation_status, r."expiresAt"
FROM "Order" o
LEFT JOIN "Payment" p ON p."orderId" = o.id
LEFT JOIN "Reservation" r ON r."orderId" = o.id
WHERE o.id = '<order-id>';

SELECT "action", "fromStatus", "toStatus", "actorId", "createdAt"
FROM "OrderAuditLog"
WHERE "orderId" = '<order-id>'
ORDER BY "createdAt" ASC;
```

Reconcile charged-but-unpaid orders. A `checkout.session.completed` event is
stored with the order id inside its JSON payload; join it back to `Order` and
surface any order that never reached `PAID` (late payment after release, or a
paid event that arrived after cancellation):

```sql
SELECT w."providerEventId",
       w."type",
       w."processedAt",
       o.id     AS "orderId",
       o.status AS "orderStatus",
       p.status AS "paymentStatus"
FROM "WebhookEvent" w
JOIN "Order" o
  ON o.id = w.payload #>> '{data,object,metadata,orderId}'
LEFT JOIN "Payment" p ON p."orderId" = o.id
WHERE w."type" = 'checkout.session.completed'
  AND w."processedAt" IS NOT NULL
  AND o.status <> 'PAID'
ORDER BY w."createdAt" DESC;
```

The same orders also carry a durable audit marker:

```sql
SELECT "orderId", "action", "fromStatus", "toStatus", "createdAt"
FROM "OrderAuditLog"
WHERE "action" IN ('PAYMENT_AFTER_RELEASE', 'PAYMENT_AFTER_CANCELLATION')
ORDER BY "createdAt" DESC;
```

Customer cancels and admin refunds are audited the same way:

```sql
SELECT "orderId", "action", "fromStatus", "toStatus", "actorId", "createdAt"
FROM "OrderAuditLog"
WHERE "action" IN ('ORDER_CANCELLED', 'ORDER_REFUNDED')
ORDER BY "createdAt" DESC;
```

Return requests and admin return decisions have their own audit actions
(decision rows leave `fromStatus`/`toStatus` null — the order row itself is
unchanged; the refund writes its own `ORDER_REFUNDED` row):

```sql
SELECT "orderId", "action", "fromStatus", "toStatus", "actorId", "createdAt"
FROM "OrderAuditLog"
WHERE "action" IN ('RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED')
ORDER BY "createdAt" DESC;
```

Triage pending returns (the same signal as the `Return` column on
`/admin/orders`):

```sql
SELECT "orderId", "reason", "status", "createdAt"
FROM "ReturnRequest"
WHERE "status" = 'PENDING'
ORDER BY "createdAt" ASC;
```

`ORDER_CANCELLED` rows have `fromStatus = 'PENDING'`, `toStatus = 'CANCELLED'`
(actor is the user id, or `NULL` for a guest cancelling with their token);
`ORDER_REFUNDED` rows have `fromStatus = 'PAID'`, `toStatus = 'CANCELLED'`
(actor is the refunding admin). A refunded order additionally reads
`Payment.status = 'REFUNDED'`; a cancelled-but-never-paid order reads
`Payment.status = 'CANCELLED'`.

Useful checks:

- Stuck `PENDING` order: confirm the webhook was delivered and signed with the
  current secret; resend the event instead of updating rows by hand.
- `PAID` order with `COMMITTED` reservations and `onHand` reduced is the
  expected terminal payment state.
- `CANCELLED` order should have `RELEASED` reservations, `reserved` restored,
  and `onHand` unchanged.
- `DELIVERED`/`CANCELLED` fulfillment are terminal; further transitions are
  rejected before any write.
