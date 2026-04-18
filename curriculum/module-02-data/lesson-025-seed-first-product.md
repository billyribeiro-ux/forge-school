---
number: 25
commit: 6d3d6848a9c9d1059d9e729819b268e8c2757726
slug: seed-first-product
title: Seed the first test product
module: 2
moduleSlug: data
moduleTitle: Data
phase: 2
step: 9
previous: 24
next: 26
estimatedMinutes: 10
filesTouched:
  - scripts/seed-dev.ts
---

## Context

The seed script skeleton works, the guards fire on production-shaped URLs, `pnpm db:seed` exits clean. Time to insert the first real fixture: the **ForgeSchool Lifetime** product and its single one-time price of $497.

This product matters for everything downstream. Module 4's Stripe integration creates a Stripe test Product + Price that mirror this row. Module 5's pricing page reads from the `products` + `prices` tables, not from hardcoded JSX, which means this seed is what renders on `/pricing`. The entire commerce flow in Module 4 — add-to-cart, checkout, webhook grant, entitlement revocation — exercises this row end-to-end.

We seed it with deterministic IDs — a slug and a test-mode Stripe ID — so rerunning `pnpm db:seed` after a reset produces the identical data. Idempotency is via `onConflictDoNothing` on the unique columns (`products.slug`, `prices.stripe_price_id`).

## The command

Extend `scripts/seed-dev.ts`. Replace the placeholder body with an explicit seed function:

```ts
async function seedProducts(db: ReturnType<typeof drizzle<typeof schema>>): Promise<void> {
  console.log('[seed] products + prices...');

  const [lifetime] = await db
    .insert(schema.products)
    .values({
      slug: 'forgeschool-lifetime',
      name: 'ForgeSchool — Lifetime',
      description:
        'One-time purchase, permanent access to every lesson and every future module.',
      kind: 'lifetime',
      status: 'active',
      stripeProductId: 'prod_test_forgeschool_lifetime'
    })
    .onConflictDoNothing({ target: schema.products.slug })
    .returning();

  // `returning()` on a skipped conflict returns an empty array. Look the row
  // up explicitly so the price insert has a productId to point at.
  const lifetimeRow =
    lifetime ??
    (await db.query.products.findFirst({
      where: (p, { eq }) => eq(p.slug, 'forgeschool-lifetime')
    }));

  if (lifetimeRow === undefined) {
    throw new Error('[seed] failed to locate ForgeSchool Lifetime product after upsert');
  }

  await db
    .insert(schema.prices)
    .values({
      productId: lifetimeRow.id,
      stripePriceId: 'price_test_forgeschool_lifetime_497',
      currency: 'usd',
      unitAmountCents: 49700,
      interval: 'one_time',
      active: true
    })
    .onConflictDoNothing({ target: schema.prices.stripePriceId });

  console.log('[seed]   ✓ ForgeSchool Lifetime @ $497 (test mode)');
}

async function main(): Promise<void> {
  const client = postgres(databaseUrl, { max: 1, prepare: false });
  const db = drizzle(client, { schema });

  try {
    console.log('[seed] inserting dev fixtures...');
    await seedProducts(db);
    console.log('[seed] done');
  } finally {
    await client.end({ timeout: 5 });
  }
}
```

Three careful details:

1. **`onConflictDoNothing` on the slug**, not the id. The id is a UUID generated per insert; every run would produce a new id and never conflict. The slug is the business-level unique key — conflict on that.
2. **The `lifetime ?? findFirst` fallback.** Postgres' `ON CONFLICT DO NOTHING` returns zero rows when the insert is skipped. Drizzle reflects that as an empty array, so `const [lifetime] = ...` gives `undefined` on a rerun. We fall back to a deliberate lookup so the price insert has a valid `productId` either way.
3. **`unitAmountCents: 49700`** — $497.00 expressed in minor units. The schema's `unitAmountCents: integer` doesn't accept floats. Writing `497.00` or `49700 / 100` in the seed would be a latent bug. Always cents, always integer.

Run the seed against a fresh database:

```bash
pnpm db:reset && pnpm db:seed
```

Expected output:

```
[reset] done
[seed] inserting dev fixtures...
[seed] products + prices...
[seed]   ✓ ForgeSchool Lifetime @ $497 (test mode)
[seed] done
```

Verify the row exists with the shape we expect:

```bash
docker exec forgeschool-postgres psql -U forgeschool -d forgeschool \
  -c "SELECT slug, kind, status, stripe_product_id FROM products;"
```

Expected: one row, `forgeschool-lifetime | lifetime | active | prod_test_forgeschool_lifetime`.

```bash
docker exec forgeschool-postgres psql -U forgeschool -d forgeschool \
  -c "SELECT stripe_price_id, unit_amount_cents, currency, interval FROM prices;"
```

Expected: one row, `price_test_forgeschool_lifetime_497 | 49700 | usd | one_time`.

Rerun the seed and confirm it's idempotent:

```bash
pnpm db:seed
```

Expected: same output, no errors, no duplicated rows.

```bash
docker exec forgeschool-postgres psql -U forgeschool -d forgeschool \
  -c "SELECT count(*) FROM products;"
```

Expected: `1` (still one row after the second seed call).

## Why we chose this — the PE7 judgment

**Alternative 1: Insert without `onConflictDoNothing` — let a rerun fail**
"Resetting before seeding" is the implied workflow, so a conflict would indicate the developer forgot to reset. Failing noisily is defensible. It also breaks legitimate flows: re-running the seed to add new fixtures to an already-seeded database, running the seed in CI where the DB state may vary. Idempotent-by-design seeds are strictly more flexible without sacrificing safety.

**Alternative 2: Upsert with `onConflictDoUpdate`**
Upsert would update the existing row's name/description on every rerun. Tempting — lets you tweak the seed fixture and see the change immediately. Also dangerous: if a test flow depends on `unit_amount_cents = 49700` and someone changes the seed, a silent `UPDATE` on every rerun can mask regressions. `DO NOTHING` means "if it exists, leave it alone" — explicit and predictable.

**Alternative 3: Hand-written SQL `INSERT` statements in a `.sql` file**
No type safety. No way to derive `productId` for the price insert without a hardcoded UUID or a query. The Drizzle version catches column-name typos at compile time — a rename in `schema.ts` produces a type error at the exact `values()` call that needs updating.

**Alternative 4: Generate the seed data with a factory library (like Faker)**
Random-ish data has a place — load testing, volume testing. For dev fixtures that the rest of the app references by slug and price ID, deterministic data is required. Faker's "random name" would break the `/pricing` page's "ForgeSchool Lifetime" heading the moment a refresh produced different words.

**Alternative 5: Store the seed fixtures in JSON/YAML, parse and insert**
A data-driven seed pattern. Works. Adds a parser layer and loses the type safety of hand-authoring with Drizzle's typed `values()`. For v1's one-product seed, the overhead isn't worth it. If the seed grows to 100+ products, we'll revisit.

The PE7 choice — hand-authored, idempotent Drizzle inserts, cents-as-integer, explicit fallback for returning-empty-on-conflict — wins because it's type-safe, deterministic, and reruns without side effects.

## What could go wrong

**Symptom:** Seed errors with `duplicate key value violates unique constraint "products_slug_uq"`
**Cause:** The `onConflictDoNothing` target was written as `{ target: schema.products.id }` instead of the correct `schema.products.slug`. Drizzle sent the conflict clause for `id`, which doesn't match the actual unique violation on `slug`.
**Fix:** The target column must match the unique constraint that would be violated. Use `slug` (the business key).

**Symptom:** Second seed run finds `lifetime` as `undefined` and throws "failed to locate ForgeSchool Lifetime"
**Cause:** The `returning()` call on a skipped conflict yields `[]`, and the fallback `findFirst` is returning `undefined`. Likely the slug in the `where` clause doesn't match the slug in `values()`.
**Fix:** Audit that both strings are identical. One common slip: `'ForgeSchool-Lifetime'` vs `'forgeschool-lifetime'` (case difference).

**Symptom:** The price insert fails with `null value in column "product_id"`
**Cause:** `lifetimeRow` is `undefined` when the price insert runs, so `productId: lifetimeRow.id` passes `undefined` (which Drizzle serializes as NULL).
**Fix:** The fallback pattern catches this. If it still fires, the `findFirst` logic is bad — check the query shape.

**Symptom:** Running the seed from CI fails with `NODE_ENV=production` error
**Cause:** CI sets `NODE_ENV=production` by default for speed (skipping dev deps). The seed guard rightly refuses.
**Fix:** CI should either run `NODE_ENV=test pnpm db:seed` or use a dedicated test seed. Running production seeds in production is out-of-scope for this script — production data seeding is its own release process.

## Verify

```bash
# Seed + reset loop is idempotent
pnpm db:reset && pnpm db:seed && pnpm db:seed
```
Expected: completes without errors; second `db:seed` is a no-op.

```bash
# Exactly one product and one price
docker exec forgeschool-postgres psql -U forgeschool -d forgeschool \
  -c "SELECT count(*) FROM products; SELECT count(*) FROM prices;"
```
Expected: `1` and `1`.

```bash
# Price row references the correct product
docker exec forgeschool-postgres psql -U forgeschool -d forgeschool \
  -c "SELECT pr.slug, p.unit_amount_cents, p.currency FROM prices p JOIN products pr ON pr.id = p.product_id;"
```
Expected: one row, `forgeschool-lifetime | 49700 | usd`.

```bash
pnpm check
```
Expected: 0 errors.

## Mistake log — things that went wrong the first time I did this

- **Used `.onConflictDoNothing({ target: schema.products.id })`.** Drizzle accepted the type, but the unique violation was on `slug`, not `id`. Postgres threw the constraint error. Fixed to `target: schema.products.slug`.
- **Wrote `unitAmountCents: 497.00`.** TypeScript passed it to an integer column; Postgres returned `UndefinedColumn` because numeric coercion silently dropped the decimal, but also complained about the literal format. Switched to `49700`. Rule: cents are always integers, never "dollars as decimal". The temptation to write "497" and multiply later is a trap — do the multiplication once, commit the integer.
- **Put the seed function inline in `main()` as a single async block.** Became unreadable at 40 lines. Extracted `seedProducts()` as a named function. Future seeds (`seedCoupons`, `seedCarts`) become siblings, each testable in isolation.
- **Forgot the `returning()` fallback the first time.** First seed run: the insert succeeded and `lifetime` was the row. Worked fine. Second run: the insert skipped, `lifetime` was undefined, the price insert crashed with "cannot read property 'id' of undefined." Added the fallback `findFirst` — rerun behavior is now clean.

## Commit this change

```bash
git add scripts/seed-dev.ts
git add curriculum/module-02-data/lesson-025-seed-first-product.md
git commit -m "feat(db): seed ForgeSchool Lifetime product + price + lesson 025"
```

With one real row in `products` and one in `prices`, the database is no longer a blank schema — it's a working dev environment. Lesson 026 writes the first Vitest test that queries this row, establishing the pattern every future data-layer test follows.
