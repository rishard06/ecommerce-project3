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
- `features/inventory/server/release-expired-reservations.ts`
- `app/api/webhooks/stripe/route.ts`
- `app/api/cron/release-reservations/route.ts`

All money is an integer number of USD cents. The order stores immutable
snapshots of line items, prices, totals, and shipping; later catalog edits do
not rewrite existing orders. Tax is 1.5% of the subtotal rounded to cents,
shipping is 0, and the total is `subtotal + tax + shipping`
(`lib/pricing.ts`).

---

## 1. The four state machines

These are independent on purpose. A payment webhook never advances
fulfillment, and an admin fulfillment change never touches payment truth.

### OrderStatus (`Order.status`)

| Value | Meaning |
| --- | --- |
| `PENDING` | Created at checkout; stock is reserved; awaiting a signed payment result or expiry. |
| `PAID` | A signed Stripe webhook confirmed payment and stock was committed. |
| `CANCELLED` | Checkout expired or the reservation was reclaimed. No payment is due. |

Allowed transitions:

```text
PENDING ──(checkout.session.completed + paid)──▶ PAID
PENDING ──(checkout.session.expired)───────────▶ CANCELLED
PENDING ──(cleanup after reservation TTL)─────▶ CANCELLED
```

`PAID` and `CANCELLED` are terminal for the implemented services. Every write
is conditional on the observed status, so a late or duplicate webhook cannot
resurrect a cancelled order.

### PaymentStatus (`Payment.status`)

| Value | Meaning |
| --- | --- |
| `PENDING` | Payment row created with the order. |
| `SUCCEEDED` | Signed webhook reported a paid session; stock committed. |
| `CANCELLED` | The checkout expired or the hold was reclaimed. |
| `FAILED` | Declared in the schema; no current code path writes it (reserved for future reconciliation/manual use). |

```text
PENDING ──(paid webhook)──▶ SUCCEEDED
PENDING ──(expired/cleanup)▶ CANCELLED
```

A payment can never go `SUCCEEDED → CANCELLED`; releasing a paid order is a
no-op by design.

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
or release reservations; those are payment/order concerns. The transition is
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
customer's id is indistinguishable from a missing one (`null` → 404). Pages
call `requireUser()` first; anonymous visitors are redirected to `/login`.
Customers can only read their own orders and never mutate payment state.

### Step 6 — Admin fulfillment

Admin pages (`/admin/orders`, `/admin/orders/[id]`) are protected twice: the
route-group layout and each page call `requireAdmin()`. `updateFulfillmentAction`
runs the same guard before parsing input and takes the actor id from the
session, never from the form. `updateFulfillment` applies only the transitions
in §1 and records the audit entry in the same transaction. Non-admins get a
404 from the layout; anonymous users are redirected to login.

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

Useful checks:

- Stuck `PENDING` order: confirm the webhook was delivered and signed with the
  current secret; resend the event instead of updating rows by hand.
- `PAID` order with `COMMITTED` reservations and `onHand` reduced is the
  expected terminal payment state.
- `CANCELLED` order should have `RELEASED` reservations, `reserved` restored,
  and `onHand` unchanged.
- `DELIVERED`/`CANCELLED` fulfillment are terminal; further transitions are
  rejected before any write.
