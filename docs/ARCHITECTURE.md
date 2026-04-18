# ForgeSchool — Architecture

**Version:** 1.0.0
**Last updated:** 2026-04-18
**Owner:** Billy Ribeiro

---

## 1. Scope

This document describes the technical architecture of ForgeSchool v1. It is authoritative for the shape of the data model, the partitioning of server vs. client code, the module layout within `src/`, and the observable runtime behavior. When the spec (`docs/SPEC.md`) and this document conflict, the spec wins for product decisions; this document wins for technical decisions.

## 2. Runtime topology

ForgeSchool is a single SvelteKit 2 application. It owns both the frontend (Svelte 5 components rendered with runes) and the backend (endpoints, form actions, hooks, load functions running on Node). There is no separate API layer, no second service.

Dependencies outside the SvelteKit process:

- **PostgreSQL 16** — the only persistent data store. Local via Docker (`docker-compose.yml`); prod TBD in Module 8.
- **Stripe** — payments, subscriptions, invoices, refunds. Test-mode keys only in v1.
- **Resend** — transactional email for the contact form. Test account in v1.
- **Sentry** — server + client error aggregation. Wired in Module 8.
- **Plausible** — privacy-respecting analytics. Wired in Module 7.

All other content — lessons, product metadata, marketing copy — lives in the repo (Markdown under `curriculum/`, tokens/strings in code).

## 3. Source tree — module layout

```
src/
├── lib/
│   ├── components/           # reusable UI (ui, entitlement, marketing, course)
│   ├── icons/                # generated Svelte icon components
│   │   ├── raw/              # hand-authored SVG sources
│   │   └── generated/        # scripts/generate-icons.ts output
│   ├── server/               # SERVER-ONLY — client imports throw at build
│   │   ├── db/
│   │   │   ├── index.ts      # Drizzle client singleton
│   │   │   └── schema.ts     # table + enum declarations (source of truth)
│   │   ├── logger.ts         # pino singleton
│   │   ├── curriculum/       # markdown lesson loader (Module 3)
│   │   ├── stripe/           # Stripe SDK wrapper (Module 4)
│   │   └── entitlements/     # grant / revoke logic (Module 4)
│   ├── styles/               # tokens, breakpoints, typography, layers, reset, base
│   ├── types/                # cross-cutting shared types
│   └── utils/                # pure helpers
├── routes/
│   ├── (marketing)/          # public layout, landing, pricing, legal
│   ├── (app)/                # authenticated-eventually surface (auth deferred)
│   │   ├── lessons/
│   │   └── account/
│   ├── api/
│   │   └── webhooks/
│   │       └── stripe/+server.ts
│   └── dev/                  # dev-only utilities, tree-shaken from prod
├── hooks.server.ts           # request log + handleError + correlation id
├── app.d.ts                  # App.Error shape; ambient types
└── app.html                  # document shell
```

Everything under `src/lib/server/` is reachable only from server code (load functions, hooks, `+server.ts` endpoints). SvelteKit's bundler enforces this — a client-side import of `$lib/server/...` is a build error.

## 4. Data model — entity overview

The database has **13 tables** in v1. The boundaries are:

- **Catalog** — `products`, `prices`, `product_categories`, `product_category_memberships`
- **Commerce** — `orders`, `order_items`, `payments`, `refunds`, `subscriptions`
- **Access** — `entitlements` (grants a user or session access to a product)
- **Promotions** — `coupons`, `coupon_redemptions`
- **Sessions** — `carts`, `cart_items`
- **Integrity** — `webhook_events` (Stripe event idempotency)

v1 ships **auth-free**. There is therefore no `users` table. Every entity that would normally point to a user points instead to a `session_id` (an opaque cookie value). When auth lands in a future module, a nullable `user_id` column is added to each of these tables and a migration backfills from the session table.

### 4.1 Entity fields (not exhaustive — full shape lands in `schema.ts`)

#### products
- `id: uuid pk`
- `slug: text unique not null`
- `name: text not null`
- `description: text`
- `kind: enum('course' | 'bundle' | 'subscription' | 'lifetime') not null`
- `status: enum('draft' | 'active' | 'archived') not null default 'draft'`
- `stripe_product_id: text unique` — denormalized mirror of Stripe's product id
- `created_at, updated_at: timestamptz not null default now()`

#### prices
- `id: uuid pk`
- `product_id: uuid fk -> products.id`
- `stripe_price_id: text unique not null` — authoritative id from Stripe
- `currency: char(3) not null default 'usd'`
- `unit_amount: integer not null` — minor units (cents); never floating point
- `interval: enum('one_time' | 'month' | 'year')` — null means one-time
- `interval_count: integer` — null or positive (every N months/years)
- `trial_period_days: integer`
- `active: boolean not null default true`
- `created_at, updated_at`

#### product_categories, product_category_memberships
Standard taxonomy + join table. Used for browsing the catalog in Module 5.

#### orders
- `id: uuid pk`
- `session_id: text not null` — opaque cookie value
- `stripe_checkout_session_id: text unique` — set when a Checkout Session is created
- `status: enum('open' | 'complete' | 'expired' | 'cancelled') not null default 'open'`
- `currency: char(3) not null`
- `subtotal_cents: integer not null default 0`
- `discount_cents: integer not null default 0`
- `total_cents: integer not null default 0`
- `coupon_id: uuid fk -> coupons.id nullable`
- `created_at, updated_at`

#### order_items
- `id: uuid pk`
- `order_id: uuid fk -> orders.id`
- `price_id: uuid fk -> prices.id`
- `quantity: integer not null default 1`
- `unit_amount_cents: integer not null` — captured at checkout time, immune to later price changes

#### payments
- `id: uuid pk`
- `order_id: uuid fk -> orders.id`
- `stripe_payment_intent_id: text unique not null`
- `status: text not null` — mirrors Stripe status ('succeeded', 'requires_action', etc.)
- `amount_cents: integer not null`
- `currency: char(3) not null`
- `paid_at: timestamptz`
- `created_at`

#### refunds
- `id: uuid pk`
- `payment_id: uuid fk -> payments.id`
- `stripe_refund_id: text unique not null`
- `status: text not null`
- `amount_cents: integer not null`
- `reason: text`
- `created_at`

#### subscriptions
- `id: uuid pk`
- `session_id: text not null`
- `stripe_subscription_id: text unique not null`
- `stripe_customer_id: text not null`
- `price_id: uuid fk -> prices.id`
- `status: enum('trialing' | 'active' | 'past_due' | 'cancelled' | 'unpaid' | 'paused') not null`
- `current_period_start, current_period_end: timestamptz not null`
- `cancel_at_period_end: boolean not null default false`
- `trial_end: timestamptz`
- `created_at, updated_at`

#### entitlements
- `id: uuid pk`
- `session_id: text not null`
- `product_id: uuid fk -> products.id`
- `source: enum('purchase' | 'subscription' | 'grant' | 'trial') not null`
- `source_ref: text` — e.g. subscription id, purchase id, admin note
- `granted_at: timestamptz not null default now()`
- `revoked_at: timestamptz` — null = active
- Unique: `(session_id, product_id, source)` so re-grants are idempotent

#### coupons
- `id: uuid pk`
- `code: text unique not null`
- `stripe_coupon_id: text unique`
- `discount_type: enum('percent' | 'amount') not null`
- `discount_value: integer not null` — 20 = 20% or 2000 cents depending on type
- `duration: enum('once' | 'repeating' | 'forever') not null`
- `duration_in_months: integer`
- `max_redemptions: integer`
- `redemptions_count: integer not null default 0`
- `valid_from, valid_until: timestamptz`
- `active: boolean not null default true`

#### coupon_redemptions
- `id: uuid pk`
- `coupon_id: uuid fk -> coupons.id`
- `order_id: uuid fk -> orders.id`
- `session_id: text not null`
- `created_at`
- Unique: `(coupon_id, order_id)` — one redemption per coupon per order

#### carts, cart_items
- `carts`: `id uuid pk`, `session_id text unique`, `coupon_id uuid nullable fk`, timestamps
- `cart_items`: `id uuid pk`, `cart_id uuid fk`, `price_id uuid fk`, `quantity int`, timestamps

#### webhook_events
- `id: uuid pk`
- `stripe_event_id: text unique not null` — Stripe's `evt_...` id
- `type: text not null` — `checkout.session.completed`, etc.
- `processed_at: timestamptz not null default now()`
- Purpose: idempotency — Stripe may deliver the same event multiple times. We insert on first receipt; unique constraint on `stripe_event_id` makes duplicates a no-op.

### 4.2 Relationships (textual ERD)

```
products 1 ───< prices
products M ───M product_categories  (via product_category_memberships)

orders 1 ───< order_items ───> prices (as reference)
orders 1 ───< payments 1 ───< refunds
orders M ───> coupons  (nullable, one coupon per order)

subscriptions M ───> prices
subscriptions 1 ───> session_id

entitlements M ───> products
entitlements 1 ───> session_id

coupons 1 ───< coupon_redemptions ───> orders

carts 1 ───< cart_items ───> prices
carts 1 ───> session_id (unique — one cart per session)

webhook_events — standalone, indexed by stripe_event_id
```

### 4.3 Design decisions worth documenting

- **`session_id` as the universal principal in v1.** Every commerce-adjacent table has `session_id` instead of `user_id`. When auth lands, a migration adds a nullable `user_id` column and a `user_session_links` join; existing rows keep their `session_id` for continuity.
- **Cents everywhere, never floats.** Every money column is `integer` in minor currency units. Floating-point math on money is forbidden.
- **Stripe IDs as unique constraints.** Every table that mirrors a Stripe object (products, prices, orders, payments, refunds, subscriptions, coupons, webhook_events) has a unique index on the Stripe ID. This is the key Stripe webhooks look up on.
- **Entitlements are the grant truth, not orders.** The checkout success URL creates an order; the webhook grants the entitlement. Client code checks entitlements, never orders. This is the single rule that prevents "paid but no access" bugs.
- **`webhook_events` as the idempotency ledger.** Every Stripe webhook insert is guarded by `ON CONFLICT (stripe_event_id) DO NOTHING`. If the insert succeeds, we process; if it fails, Stripe redelivered, we skip.
- **Soft deletes only where audit trails matter.** `entitlements.revoked_at` is nullable; soft-delete semantics. `carts`, `cart_items`, `webhook_events` can be hard-deleted (operational cleanup).
- **`updated_at` on mutable rows only.** Tables that are append-only (`payments`, `refunds`, `coupon_redemptions`, `webhook_events`, `order_items`) have only `created_at`. Tables that mutate (`products`, `prices`, `orders`, `subscriptions`, `entitlements`, `coupons`) have both.
- **Timestamps in `timestamptz`.** The database normalizes to UTC; the client renders in local time.

### 4.4 Indexes (beyond PKs and unique constraints)

- `products (status, kind)` — catalog listing
- `prices (product_id, active)` — price-of-product lookup
- `orders (session_id, created_at desc)` — user order history
- `subscriptions (session_id, status)` — active-subscription lookup
- `entitlements (session_id, revoked_at)` — gating check
- `coupon_redemptions (coupon_id)` — redemption count rollup
- `webhook_events (type, processed_at desc)` — ops dashboard / debugging

## 5. Route architecture (summary)

```
/                               — marketing landing (Module 6)
/pricing                        — catalog + prices (Module 4)
/checkout/[product]/+server     — creates Stripe Checkout Session
/checkout/success               — thank-you page (not the grant path)
/account/billing                — Stripe Billing Portal handoff
/lessons                        — all modules (Module 3)
/lessons/[slug]                 — individual lesson (Module 3)
/api/webhooks/stripe/+server    — Stripe webhook receiver (Module 4)
/dev/*                          — dev-only utilities (tree-shaken from prod)
```

Full route tree assembled in later modules as they land.

## 6. Security boundaries

- **Server vs. client.** `src/lib/server/**` is unreachable from client bundles. Webhook receivers, Stripe SDK calls, pino logger, database client — all server-only.
- **Secrets.** Every secret goes into `.env.local` (gitignored). `.env.example` enumerates the keys. No hard-coded keys anywhere in source.
- **CSRF.** SvelteKit's default CSRF protection is on. Form actions + `+server.ts` POST endpoints inherit it.
- **Webhook signatures.** Stripe webhook receiver verifies the signature header (`stripe-signature`) before processing any event. Signature verification uses the webhook secret from env; failure returns 400.
- **Entitlement checks.** Every gated route consults the `entitlements` table via a hook-level check — never via client-side state.

## 7. Observability

- **pino** — structured JSON logs at `info` in prod, pretty-printed at `debug` in dev. Every server request logs method/path/status/duration via `handle`. Every uncaught error logs with a correlation `errorId` via `handleError`.
- **Sentry** — client + server error aggregation. Wired in Module 8.
- **Plausible** — page-view and custom events (signup, checkout_started, checkout_completed, subscription_renewed). Wired in Module 7.
- **Drizzle Studio** — ad-hoc data inspection via `pnpm db:studio`. Local-only; not available in prod.

## 8. Out of scope for v1

- User authentication (deferred to a future module with Better Auth)
- Multi-tenant or multi-org data partitioning
- Internationalization (English-only in v1)
- Video hosting (lessons are Markdown + embedded components, no video pipeline)
- Real-time features (no websockets or SSE streams in v1)
- Admin UI beyond dev-mode affordances (flag-gated until auth lands)

## 9. Change log

- **2026-04-18** — Initial draft. Module 2 entry point. Locks the data model before schema code is written.
