---
number: 43
slug: seed-stripe-products
title: Seed Stripe test-mode products + prices
module: 4
moduleSlug: money
moduleTitle: Money
phase: 4
step: 4
previous: 42
next: null
estimatedMinutes: 25
filesTouched:
  - scripts/lib/stripe.ts
  - scripts/seed-dev.ts
---

## Context

Lesson 025 seeded the ForgeSchool Lifetime product with hardcoded placeholder Stripe IDs (`prod_test_forgeschool_lifetime`, `price_test_forgeschool_lifetime_497`). Stripe has never heard of those IDs — they were scaffolding. This lesson replaces the hardcoded values with **real Stripe test-mode product/price IDs** by calling the Stripe API from the seed script, then mirroring those resolved IDs into the DB.

Three products ship in v1's catalog now, not one:
- **ForgeSchool Lifetime** — one-time $497
- **ForgeSchool Pro Monthly** — $49/month subscription, 7-day trial
- **ForgeSchool Pro Yearly** — $497/year subscription, 14-day trial

We identify each Stripe product by a `forge_slug` metadata key and each price by a `forge_price_key` metadata key. Re-running the seed finds existing Stripe rows via metadata search instead of creating duplicates. Stripe's API has an explicit search query syntax — `metadata['forge_slug']:'...' AND active:'true'` — so this is a first-class lookup, not a hack.

The DB upsert uses `onConflictDoUpdate` (not `onConflictDoNothing` from lesson 025) because the seed now syncs real values — a price change in the spec must propagate to the DB row.

## The command

Create `scripts/lib/stripe.ts` — a thin factory for dev scripts that need Stripe:

```ts
import Stripe from 'stripe';

export function createStripe(scriptName: string): Stripe {
  const key = process.env['STRIPE_SECRET_KEY'];
  if (key === undefined || key === '' || key === 'sk_test_replace_me') {
    console.error(`[${scriptName}] STRIPE_SECRET_KEY is not set. Fill in .env.local.`);
    process.exit(1);
  }
  if (!key.startsWith('sk_test_')) {
    console.error(
      `[${scriptName}] STRIPE_SECRET_KEY must start with "sk_test_" (got "${key.slice(0, 8)}...").`
    );
    process.exit(1);
  }
  return new Stripe(key, {
    apiVersion: '2026-03-25.dahlia',
    appInfo: { name: 'forgeschool-seed', version: '0.0.1' },
    typescript: true
  });
}
```

Mirrors the same test-key guard as `src/lib/server/stripe/client.ts`. Dev scripts never hit live Stripe.

Rewrite `scripts/seed-dev.ts`. The core loop, per spec:

1. **Find or create the Stripe product.** Query `stripe.products.search({ query: "metadata['forge_slug']:'<slug>' AND active:'true'" })`. If found, use it. If not, `stripe.products.create(...)` with `metadata: { forge_slug: <slug>, forge_kind: <kind> }`.
2. **Find or create the Stripe price.** Same shape with `forge_price_key`. `stripe.prices.create(...)` includes `recurring` for subscription prices, omits it for one-time.
3. **Upsert DB product.** `onConflictDoUpdate({ target: slug, set: { ..., stripeProductId: resolved.id } })` so the DB always matches the resolved Stripe ID.
4. **Upsert DB prices.** Same shape, conflict target `stripePriceId`.

A `catalog: ProductSpec[]` array declares all three products + their prices. Adding a fourth product is a single array push.

Run it:

```bash
pnpm db:reset && pnpm db:seed
```

Expected output:

```
[reset] done
[seed] inserting dev fixtures...
[seed] products + prices (real Stripe test-mode sync)...
[seed]   ✓ forgeschool-lifetime (prod_abc...) · 1 price(s)
[seed]   ✓ forgeschool-pro-monthly (prod_def...) · 1 price(s)
[seed]   ✓ forgeschool-pro-yearly (prod_ghi...) · 1 price(s)
[seed] done
```

Verify in the Stripe dashboard: https://dashboard.stripe.com/test/products — three products with the expected names and prices. Each product's metadata tab shows `forge_slug` and `forge_kind`.

Verify in Postgres:

```bash
docker exec forgeschool-postgres psql -U forgeschool -d forgeschool \
  -c "SELECT p.slug, pr.stripe_price_id, pr.unit_amount_cents, pr.interval FROM products p JOIN prices pr ON pr.product_id = p.id ORDER BY p.slug;"
```

Expected: three rows with real `price_...` IDs from Stripe (not the `price_test_...` placeholders).

## Why we chose this — the PE7 judgment

**Alternative 1: Create products in the Stripe dashboard manually; seed only reads IDs**
Works once. Breaks the moment the student moves to a different Stripe account or the team grows. The seed script is the source of truth; the dashboard reflects what the seed did.

**Alternative 2: Use the hardcoded IDs from lesson 025 and just register them with Stripe manually**
Stripe generates product / price IDs; you can't dictate them. The IDs in the DB must be the IDs Stripe assigned.

**Alternative 3: Use Stripe's `idempotency_key` header instead of metadata-search for idempotency**
Works for create requests — the same idempotency key returns the original created object. Doesn't help for "does this product already exist?" queries across seed runs, because the idempotency key is per-request. Metadata + search is the pattern that survives across machines and sessions.

**Alternative 4: Use `onConflictDoNothing` for the DB upsert like lesson 025**
Fine when seed data is immutable. Our seed data IS mutable — we might change a price from $497 to $599, bump a trial from 7 to 14 days. `onConflictDoUpdate` keeps the DB aligned with the spec. The Stripe side of the equation is less forgiving (you can't mutate a Stripe price — you archive the old one and create a new one), so if a price changes, the next seed run creates a NEW Stripe price and the DB upsert picks up the new `stripe_price_id`.

**Alternative 5: Split into `scripts/seed-stripe.ts` and `scripts/seed-db.ts`**
Tempting separation. Also fragile: the Stripe seed produces IDs the DB seed needs, and split scripts have to pass those IDs around via disk or env. Single script, inline, is simpler.

The PE7 choice — single seed script, metadata-based idempotency, DB onConflictDoUpdate, test-key guard via shared helper — wins because it's idempotent in both Stripe and Postgres, diff-reviewable as a single file, and safe by construction.

## What could go wrong

**Symptom:** Seed creates duplicate Stripe products on rerun
**Cause:** The `metadata['forge_slug']:'...' AND active:'true'` search query isn't matching the existing product. Usually a slug mismatch between runs or a typo in the search string.
**Fix:** Check the Stripe dashboard → Products → click the product → Metadata tab. Confirm `forge_slug` value. If the slug changed, archive the old product in Stripe (it won't match the new slug and the search won't find it).

**Symptom:** `search` returns no results even though the product was just created
**Cause:** Stripe's search index has a small delay (usually sub-second, occasionally a few seconds). The second `search` call might fire before the index catches up.
**Fix:** Rare in practice for single-request-per-spec loops. If it happens, the loop would create a second product. Mitigation: archive duplicates in the dashboard.

**Symptom:** Drizzle errors on `onConflictDoUpdate` with "column cannot be cast" or similar
**Cause:** A schema change between lesson 020 and now; a column's type doesn't match what we're inserting.
**Fix:** `pnpm db:reset` to regenerate the schema; verify the upsert's `set` clause covers only mutable fields.

**Symptom:** STRIPE_SECRET_KEY guard fires from `scripts/lib/stripe.ts` even though `.env.local` has the right key
**Cause:** Script isn't running via the `pnpm db:seed` path; process.env isn't populated.
**Fix:** Always invoke seed via `pnpm db:seed`. The script's top-level `loadEnv()` reads `.env.local` via dotenv — running the `.ts` file directly with `tsx` doesn't bypass that because tsx does respect the import-level calls.

## Verify

```bash
pnpm db:reset && pnpm db:seed
```
Expected: 3 products logged with real Stripe product IDs; no duplicates on rerun.

```bash
# Stripe dashboard check
open https://dashboard.stripe.com/test/products
```
Expected: 3 products with names "ForgeSchool — Lifetime", "ForgeSchool Pro — Monthly", "ForgeSchool Pro — Yearly". Each metadata tab shows `forge_slug`.

```bash
# DB check
docker exec forgeschool-postgres psql -U forgeschool -d forgeschool \
  -c "SELECT count(*) FROM products; SELECT count(*) FROM prices;"
```
Expected: `3` and `3`.

```bash
pnpm check
pnpm build
```
Expected: 0 errors.

## Mistake log — things that went wrong the first time I did this

- **Used `onConflictDoNothing` for products.** Changed a description; reran seed; DB still had the old description. Swapped to `onConflictDoUpdate` with a small `set` clause covering the mutable fields (name, description, kind, stripeProductId, updatedAt). Immutable fields like `id` and `createdAt` stay out of the set.
- **Forgot `forge_price_key` metadata on Stripe prices.** Products had `forge_slug`, prices didn't. Second seed run for the same product couldn't find the existing price — created a duplicate. Added the metadata; idempotency restored.
- **Tried to use `stripe.products.list({...})` with a filter.** The `list` API filters are limited; it doesn't support metadata filters. `stripe.products.search({ query: ... })` does, with the Stripe-specific query syntax.
- **Passed `recurring: undefined` to `stripe.prices.create(...)` for one-time prices.** Stripe's SDK threw because `recurring: undefined` is a field-present-with-undefined, which the API rejected as malformed. Used conditional spread — `...(recurring !== undefined && { recurring })` — so the field is absent on one-time prices.

## Commit this change

```bash
git add scripts/lib/stripe.ts scripts/seed-dev.ts
git add curriculum/module-04-money/lesson-043-seed-stripe-products.md
git commit -m "feat(stripe): seed real test-mode products + prices + lesson 043"
```

Real Stripe IDs now live in the DB. Lesson 044 builds the `/pricing` route that reads them and renders the catalog.
