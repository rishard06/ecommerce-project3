# Production Setup Runbook

Reproducible setup for the owned-catalog storefront: PostgreSQL, Better Auth
(GitHub OAuth), hosted Stripe Checkout, signed webhooks, and the Vercel Cron
reservation cleanup.

The authoritative sources for this document are:

- `lib/env.ts` — required/optional environment variables.
- `prisma/schema.prisma` — data model and enums.
- `vercel.json` — cron schedule.
- `docs/order-lifecycle.md` — order, payment, reservation, and fulfillment states.

> **Never commit real secrets.** Every value below is a placeholder or a
> non-secret local example. `.env`, `.env.local`, and `.superpowers/` are
> gitignored.

---

## 1. Prerequisites

| Requirement | Notes |
| --- | --- |
| Node.js **22.18+** (24.x LTS recommended) | `prisma/seed.mjs` imports a `.ts` module and relies on Node's native TypeScript type stripping, which is enabled by default from Node 22.18. Tested on Node 24.11.0. Next.js 15.5 and Prisma 6 also require Node 18.18+. |
| npm 10/11 | The lockfile was produced by npm 11. See the peer-dependency note in §3. |
| PostgreSQL 14+ | Tested on PostgreSQL 18 at `localhost:5432`. The app needs an owned database (not DummyJSON). |
| Stripe account (test mode for local/staging) | Hosted Checkout is created server-side; no dashboard price IDs are used. A live-mode account is needed only for production. |
| Stripe CLI (local webhook forwarding only) | `stripe listen` forwards signed events to localhost. Not required to deploy. |
| GitHub OAuth app | One app per callback URL (separate apps for localhost and production). |
| Vercel account | Cron is configured in `vercel.json` at `*/5 * * * *`. Confirm your Vercel plan supports five-minute cron jobs (Hobby plans are limited to coarser schedules). |
| Outbound network at seed time | `prisma/seed.mjs` fetches the source catalog from `dummyjson.com`. The runtime storefront never calls DummyJSON. |

---

## 2. Environment variables

`lib/env.ts` validates these at request time. Missing **required** values make
server routes fail fast with a message that lists variable names only.

Create `.env` from the template:

```bash
cp .env.example .env
```

`.env` is the canonical local file because **Prisma CLI, the seed script, and
the test suites read `.env`**. Next.js also reads it. `.env.local` is loaded by
Next.js only (and overrides `.env`), so keep database URLs and secrets in
`.env` unless you intentionally mirror them.

| Variable | Required | Purpose | Non-secret example |
| --- | --- | --- | --- |
| `DATABASE_URL` | **Required** (server) | PostgreSQL connection string used by Prisma Client and the CLI. | `postgresql://postgres:postgres@localhost:5432/ecommerce_dev` |
| `BETTER_AUTH_SECRET` | **Required** (server) | Signs Better Auth sessions. Use a random value; rotate if leaked. | `replace-with-a-random-32-character-secret` |
| `BETTER_AUTH_URL` | **Required** (server) | Canonical base URL of the app; Better Auth and OAuth redirects depend on it. Must be a valid URL. | `http://localhost:3000` |
| `GITHUB_CLIENT_ID` | **Required** (server) | GitHub OAuth app client id. | `your-github-client-id` |
| `GITHUB_CLIENT_SECRET` | **Required** (server) | GitHub OAuth app client secret. | `your-github-client-secret` |
| `STRIPE_SECRET_KEY` | **Required** (server) | Server-side Stripe key used to create Checkout sessions and verify webhooks. Use `sk_test_...` locally, `sk_live_...` only in production. | `sk_test_your-secret-key` |
| `STRIPE_WEBHOOK_SECRET` | **Required** (server) | Signing secret for the `/api/webhooks/stripe` endpoint. Locally this is the `whsec_...` printed by `stripe listen`; in production it comes from the dashboard endpoint. | `whsec_your-webhook-signing-secret` |
| `CRON_SECRET` | **Required** (server) | Bearer secret that authenticates the Vercel Cron call to `/api/cron/release-reservations`. | `replace-with-a-random-cron-secret` |
| `NEXT_PUBLIC_APP_URL` | Optional (public) | Base URL used for Stripe success/cancel redirects. Defaults to `http://localhost:3000` when unset. | `https://store.example.com` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional (public) | Publishable key. Hosted Checkout does not read it today; it is reserved for client-side Stripe.js. | `pk_test_your-publishable-key` |
| `DATABASE_URL_TEST` | Test-only (required for `npm test`) | Disposable database used by the database-backed suites. Must differ from `DATABASE_URL`; the suites refuse to run if they match. | `postgresql://postgres:postgres@localhost:5432/ecommerce_test` |

Notes:

- `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` are required even during local work;
  `getServerEnv()` validates the whole server schema.
- Generate strong secrets with `openssl rand -base64 32` (or
  `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`).
- Use different secrets for local, preview, and production. Never reuse a test
  Stripe secret in production.

---

## 3. Local setup

### 3.1 Install dependencies

```bash
npm ci --legacy-peer-deps
```

`--legacy-peer-deps` is required with the current dependency set: `better-auth`
declares an optional peer range of `vitest ^2 || ^3 || ^4`, while this repo uses
`vitest ^5`. Plain `npm install` exits with `ERESOLVE`. If you are not using the
lockfile:

```bash
npm install --legacy-peer-deps
```

### 3.2 Create databases

Using `createdb` (or `psql`):

```bash
createdb -h localhost -U postgres ecommerce_dev
createdb -h localhost -U postgres ecommerce_test
```

The test database is disposable. CI should create it fresh on every run.

### 3.3 Generate the Prisma client

`app/generated/prisma/` is gitignored, so a fresh clone has no client yet:

```bash
npx prisma generate
```

### 3.4 Apply migrations

```bash
npx prisma migrate deploy
```

`migrate deploy` applies committed migrations and is what production uses.
Use `npx prisma migrate dev --name <name>` only when authoring a new migration.

The database-backed tests expect the schema to exist in the disposable test
database as well. Apply the same migrations to `DATABASE_URL_TEST`:

```bash
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
```

Re-run this after pulling new migrations. The test suites create and clean up
their own fixture rows; they do not create tables.

### 3.5 Seed the owned catalog

```bash
npx prisma db seed
```

The seed fetches `https://dummyjson.com/products` and
`https://dummyjson.com/products/categories`, then upserts about 24 categories
and 194 products into PostgreSQL. It is idempotent: stable `dummy-<id>` slugs
and SKUs mean reruns update rows instead of duplicating them. Runtime reads
only the owned database.

### 3.6 Start the app

```bash
npm run dev
```

Open <http://localhost:3000>. Sign in with GitHub (see §5). Orders require
Stripe webhooks to become paid; use the forwarding setup in §6.

### 3.7 Verify the database wiring

```bash
npx prisma validate
npx prisma migrate status
```

Expected: schema valid, and `Database schema is up to date!`.

---

## 4. Promote an admin

Roles live in PostgreSQL (`user.role`, default `CUSTOMER`). Sign in once so
Better Auth creates the user row, then promote by SQL — no code change or
redeploy is needed. Guards read the role from the database on every request,
so refresh the page after updating.

```bash
psql "$DATABASE_URL" -c \
  "UPDATE \"user\" SET role = 'ADMIN', \"updatedAt\" = now() WHERE email = 'owner@example.com';"
```

Or use Prisma Studio:

```bash
npx prisma studio
```

Demote with `role = 'CUSTOMER'`. Admin pages live at `/admin/products` and
`/admin/orders`; anonymous visitors are redirected to `/login`, and signed-in
customers receive a 404.

---

## 5. GitHub OAuth

1. GitHub → Settings → Developer settings → OAuth Apps → **New OAuth App**.
2. Set the homepage URL:
   - local: `http://localhost:3000`
   - production: `https://store.example.com`
3. Set the authorization callback URL to:
   - local: `http://localhost:3000/api/auth/callback/github`
   - production: `https://store.example.com/api/auth/callback/github`
4. Copy the client id/secret into `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`.
5. Make `BETTER_AUTH_URL` match the app's base URL and restart the dev server.

GitHub permits one callback URL per OAuth app, so create separate apps for
localhost and production (or update the URL when switching). A callback
mismatch appears as GitHub's `redirect_uri` error before the app is reached.

---

## 6. Stripe test-mode setup

### 6.1 Keys

In the Stripe Dashboard, enable **Test mode**, then copy:

- Secret key → `STRIPE_SECRET_KEY` (`sk_test_...`).
- Publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_test_...`,
  optional for hosted Checkout).

Checkout sessions build line items from the immutable order snapshot; there are
no Stripe price/product IDs to configure.

### 6.2 Webhook endpoint

Production: Stripe Dashboard → Developers → Webhooks → **Add endpoint**:

- URL: `https://store.example.com/api/webhooks/stripe`
- Events: `checkout.session.completed`, `checkout.session.expired`
- Copy the endpoint's signing secret into `STRIPE_WEBHOOK_SECRET`.

Local: forward events with the Stripe CLI and use the secret it prints:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe \
  --events checkout.session.completed,checkout.session.expired
```

Copy the printed `whsec_...` into `.env` as `STRIPE_WEBHOOK_SECRET`, then
restart `npm run dev`. Restart `stripe listen` whenever the CLI session ends.

**Only signed webhooks confirm payment.** The `/checkout/success` page reads
the database; it never marks an order paid from the redirect or query string.

### 6.3 Complete a test payment (manual)

This step needs a browser and the Stripe CLI/browser; it was not executed in
the automated acceptance run.

1. Add a seeded product to the cart and go to `/checkout`.
2. Submit the shipping form; the app creates a pending order, reserves stock
   for 30 minutes, and redirects to Stripe Checkout.
3. Pay with a test card:
   - `4242 4242 4242 4242` — payment succeeds.
   - `4000 0025 0000 3155` — requires 3-D Secure authentication.
   - `4000 0000 0000 9995` — declined (insufficient funds).
   - `4000 0000 0000 0002` — generic decline.
   - Any future expiry date, any 3-digit CVC, any postal code.
4. Watch `stripe listen` deliver `checkout.session.completed`; the order becomes
   `PAID`, the payment `SUCCEEDED`, and reservations `COMMITTED`.
5. Before the webhook arrives, `/checkout/success` shows “Payment is
   processing”. That is expected: the redirect is not proof of payment.

`stripe trigger checkout.session.completed` creates a synthetic session with no
`metadata.orderId`; the app logs a warning and ignores it. It cannot mark a
real order paid — complete Checkout in the browser instead.

### 6.4 Replay a webhook (manual)

Webhook delivery is idempotent by `providerEventId`. Replaying an event is a
successful no-op and must not change stock or payment state:

```bash
stripe events resend evt_xxxxxxxxxxxxx --webhook-endpoint we_xxxxxxxxxxxxx
```

Omit `--webhook-endpoint` to resend to all endpoints. You can also replay from
the Stripe Dashboard (Webhooks → event → Resend). Verify the order still has
one `WebhookEvent` row and unchanged stock.

---

## 7. Cron: expired reservation cleanup

`vercel.json` schedules `GET /api/cron/release-reservations` every five
minutes. When `CRON_SECRET` is set in the Vercel project, Vercel sends:

```http
Authorization: Bearer <CRON_SECRET>
```

The route rejects any other token with `401` before touching the database.
Cleanup releases reservations whose `expiresAt` has passed, decrements only
`reserved` (never `onHand`), and cancels a still-pending order/payment only
when no active hold remains. It never touches paid orders and is safe to run
concurrently or repeatedly.

Manual invocation (production):

```bash
curl -i -H "Authorization: Bearer $CRON_SECRET" \
  https://store.example.com/api/cron/release-reservations
```

Expected: `200` and `{"released":0}` (or the number released). Without the
header, expect `401`.

Local invocation:

```bash
curl -i -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/release-reservations
```

One invocation processes at most 100 expired reservations
(`BATCH_SIZE` in `features/inventory/server/release-expired-reservations.ts`).

---

## 8. Backups and restores

Use the managed PostgreSQL provider's automated backups and point-in-time
recovery in production. Supplement with logical dumps before risky operations:

```bash
pg_dump "$DATABASE_URL" --format=custom \
  --file="backup-$(date +%Y%m%d-%H%M%S).dump"
```

Restore drill (never restore over a live database without a maintenance
window):

```bash
createdb -h localhost -U postgres ecommerce_restore_check
pg_restore --dbname="postgresql://postgres:postgres@localhost:5432/ecommerce_restore_check" \
  --clean --if-exists backup-YYYYMMDD-HHMMSS.dump
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ecommerce_restore_check" \
  npx prisma migrate status
```

Then run a read-only smoke test (storefront, an order lookup) against the
restored database. Back up before migrations and before bulk catalog imports.
Treat dumps as secrets: they contain customer and order data.

---

## 9. Payment confirmation rule (operational invariant)

- **Only a signed Stripe webhook may confirm payment.** `Order.status = PAID`
  and `Payment.status = SUCCEEDED` are written only by
  `processStripeEvent` → `markCheckoutPaid`.
- A successful Checkout redirect, the success page, and the query string are
  display-only. `/checkout/success` reads the database and shows “processing”
  until the webhook lands.
- Webhook signatures are verified over the exact raw request bytes. Missing or
  invalid signatures return `400` and never reach payment or stock logic.
- Processing failures return `500` so Stripe retries. Duplicate deliveries are
  idempotent no-ops (unique `providerEventId`).
- Never “fix” a stuck order by setting it to `PAID` by hand. Inspect Stripe,
  resend the event, and reconcile with a refund/void if necessary. Manual SQL
  changes bypass stock commits and audit history.

---

## 10. Production launch checklist

- [ ] Production PostgreSQL provisioned; `npx prisma migrate deploy` applied;
  catalog seeded/imported; at least one `ADMIN` promoted (§4).
- [ ] All required variables from §2 set in the hosting environment
  (Production and Preview); `DATABASE_URL_TEST` is **not** set in production.
- [ ] `BETTER_AUTH_SECRET` and `CRON_SECRET` freshly generated for production;
  no local/test values reused.
- [ ] `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` set to the public HTTPS URL;
  no `localhost` values.
- [ ] GitHub OAuth app callback updated to
  `https://<domain>/api/auth/callback/github`; test sign-in works.
- [ ] Stripe live keys swapped in (`sk_live_...`, `pk_live_...` if used) and
  test keys removed.
- [ ] Live webhook endpoint added with its own `whsec_...`; both
  `checkout.session.completed` and `checkout.session.expired` selected; a test
  delivery succeeds from the dashboard.
- [ ] `CRON_SECRET` set in Vercel; `vercel.json` deployed; manual cron call
  returns `200` with the bearer token and `401` without it.
- [ ] `npx prisma validate`, `npx prisma migrate status`, `npm test`,
  `npx tsc --noEmit`, and `npm run build` pass on the release commit.
- [ ] Staging smoke test: admin product update → checkout → signed webhook →
  order history → admin fulfillment → cleanup. In production, use a low-value
  live purchase and refund, or rely on Stripe's test clocks before go-live.
- [ ] Automated backups enabled and a restore drill recorded (§8).
- [ ] Observe the pre-webhook state once: the success page must show
  “processing”, not “paid”, proving the redirect does not confirm payment.
- [ ] Rotate any secret that appeared in logs, screenshots, or chat.

---

## 11. Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| `npm install` fails with `ERESOLVE` mentioning `better-auth` and `vitest` | Use `npm ci --legacy-peer-deps` / `npm install --legacy-peer-deps` (§3.1). |
| `Environment variable not found: DATABASE_URL` | Prisma CLI reads `.env`, not `.env.local`. Put `DATABASE_URL` in `.env` or export it in the shell. |
| `Missing or invalid server environment variables: ...` | One or more required keys in §2 are absent. The message lists only names. |
| `stripe-signature` / `400 Invalid stripe-signature header` | The signing secret does not match the sender. Locally, restart `npm run dev` after copying the `stripe listen` secret; in production, use the endpoint's secret. |
| Order stays `PENDING` after paying | Webhook not delivered or failed. Check `stripe listen` / Dashboard deliveries; resend the event. Do not edit the order to `PAID`. |
| Payment succeeds after the reservation expired | The order intentionally stays `PENDING` rather than selling released stock. Refund/void in Stripe and reconcile manually; see `docs/order-lifecycle.md`. |
| Cron returns `401` | `CRON_SECRET` missing/mismatched, or the caller omitted `Authorization: Bearer`. |
| Seed fails with `GET https://dummyjson.com/... failed` | Outbound network/DNS is blocked. The runtime does not need DummyJSON; seed from a networked machine. |
