# Venn Store

A production-shaped e-commerce storefront built with Next.js 15, PostgreSQL,
Better Auth, and hosted Stripe Checkout. The catalog, cart pricing, orders,
payments, stock reservations, and fulfillment all live in the owned database;
DummyJSON is only a seed-time source.

## Features

- **Owned PostgreSQL catalog** — categories, products, images, and variants
  with integer-cent prices. `prisma/seed.mjs` imports ~194 products from
  DummyJSON once; the runtime never calls it.
- **Admin catalog management** — server-validated create/update/archive flows
  at `/admin/products`. Products are archived, never hard-deleted, so order
  history keeps its snapshots.
- **DB-authoritative cart quotes** — the browser sends only variant ids and
  quantities. Totals are quoted from the database (1.5% tax, free shipping,
  integer cents).
- **Atomic pending orders** — one transaction reserves stock, snapshots line
  items/shipping/prices, and creates the payment. Per-user idempotency keys
  make duplicate submits return the same order without a second reservation.
- **30-minute stock reservations** — a hold is committed only by a paid
  webhook, released on checkout expiry, or reclaimed by the cleanup cron.
- **Hosted Stripe Checkout** — sessions are built from immutable order
  snapshots; the session refuses to start if the charge would differ from the
  order total.
- **Signed, idempotent webhooks** — `/api/webhooks/stripe` verifies the raw
  payload signature before any payment or stock logic runs. Replays are
  successful no-ops keyed by the provider event id.
- **Customer order history** — `/orders` and `/orders/[id]`; ownership is part
  of every SQL predicate, so customers only see their own orders.
- **Admin fulfillment with audit** — `UNFULFILLED → PROCESSING → SHIPPED →
  DELIVERED` plus an explicit cancellation branch, at `/admin/orders`. Every
  change writes an `OrderAuditLog` entry.
- **Protected reservation cleanup** — Vercel Cron calls
  `/api/cron/release-reservations` every five minutes with
  `Authorization: Bearer $CRON_SECRET`.
- **Better Auth** — GitHub OAuth and email/password sign-in; roles
  (`CUSTOMER`/`ADMIN`) are read from PostgreSQL on every request.

Payment truth is deliberately narrow: **only a signed Stripe webhook can mark
an order paid.** The success redirect and query string are display-only.

## Architecture

- `app/` — Next.js App Router. Route groups: `(shop)`, `(admin)`, `(auth)`.
  API routes: Better Auth, orders, Stripe webhook, cron cleanup.
- `features/*/server/` — business services (catalog, cart, checkout, payments,
  orders, inventory, identity). Route handlers and server actions stay thin.
- `features/*/components/` — feature UI; `components/ui/` holds shadcn/ui
  primitives.
- `lib/` — validated environment (`env.ts`), Prisma singleton, Better Auth,
  money/tax helpers, stores, guards helpers.
- `prisma/` — schema, migrations, and the DummyJSON seed importer.
- Tests are co-located as `*.test.ts` and run under Vitest; database suites
  serialize on a PostgreSQL advisory lock.

## Prerequisites

- Node.js **22.18+** (24.x LTS recommended) — the seed imports a `.ts` module
  and relies on native TypeScript type stripping.
- PostgreSQL 14+ (tested on 18).
- A Stripe test account and, for local webhooks, the Stripe CLI.
- A GitHub OAuth app.

## Quick start

```bash
createdb -h localhost -U postgres ecommerce_dev
createdb -h localhost -U postgres ecommerce_test

npm ci --legacy-peer-deps   # required: better-auth/vitest optional peer range
cp .env.example .env        # fill in the values; see docs/production-setup.md
npx prisma generate
npx prisma migrate deploy
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy  # test DB schema
npx prisma db seed
npm run dev
```

Open <http://localhost:3000>. Then:

- Promote an admin with the SQL in
  [`docs/production-setup.md`](docs/production-setup.md#4-promote-an-admin).
- Forward Stripe webhooks locally with
  `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.
- Complete a checkout with test card `4242 4242 4242 4242`.

Full runbook: [`docs/production-setup.md`](docs/production-setup.md)
(local setup, OAuth, Stripe test mode, cron, backups, launch checklist).
State machines: [`docs/order-lifecycle.md`](docs/order-lifecycle.md)
(orders, payments, reservations, fulfillment, webhook idempotency).

## Environment

Copy [`.env.example`](.env.example) to `.env`. The required server variables
are validated by `lib/env.ts`: `DATABASE_URL`, `BETTER_AUTH_SECRET`,
`BETTER_AUTH_URL`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `CRON_SECRET`.
`NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` are optional.
`DATABASE_URL_TEST` is required only by the test suite and must point at a
disposable database that differs from `DATABASE_URL`.

Use `.env` (not only `.env.local`): Prisma CLI, the seed script, and the test
suites read `.env`. `.env*` files are gitignored.

## Verification

```bash
npx prisma validate
npx prisma migrate status
npm test                 # requires DATABASE_URL_TEST (loaded from .env)
npx tsc --noEmit
npm run build
```

`npm test` runs the full Vitest suite, including the database-backed service
and route tests. Never point `DATABASE_URL_TEST` at a database you want to
keep.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server with Turbopack. |
| `npm run build` | Production build. |
| `npm run start` | Serve the production build. |
| `npm test` | Full Vitest run. |
| `npm run test:watch` | Vitest watch mode. |

## Tech stack

- Next.js 15 (App Router, Turbopack), React 19, TypeScript
- PostgreSQL + Prisma 6
- Better Auth (GitHub OAuth, email/password)
- Stripe (hosted Checkout, signed webhooks)
- Tailwind CSS v4, shadcn/ui, Motion
- Vitest + Testing Library
