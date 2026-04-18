---
number: 20
commit: 1d4292d5192d9f7738e9c95ad5ee13fc4a4649be
slug: write-drizzle-schema
title: Write the Drizzle schema
module: 2
moduleSlug: data
moduleTitle: Data
phase: 2
step: 4
previous: 19
next: 21
estimatedMinutes: 30
filesTouched:
  - src/lib/server/db/schema.ts
---

## Context

Lesson 019 described the data model in prose. This lesson translates that model — 13 tables, 7 enums, the unique constraints, the indexes, the foreign-key actions — into a single typed Drizzle file. When this file saves, TypeScript knows every column's type, every relation's shape, every enum's permitted values. The rest of the codebase will import types from here (`Product`, `NewOrder`, `Entitlement`) rather than hand-declaring anything about the database shape.

The file reads roughly top-to-bottom in dependency order: enums first, then catalog, then promotions, then commerce, then access, then cart, then the webhook ledger. Drizzle allows forward references via lazy foreign keys (`() => someTable.id`), so cross-table links are expressed cleanly without hoisting tricks. We finish the file with `$inferSelect` / `$inferInsert` type exports — the API the rest of the codebase consumes.

One important thing this lesson does NOT do: run a migration. That's lesson 021. The schema file is pure TypeScript at this point — a blueprint that drizzle-kit will translate into SQL next.

## The command

Rewrite `src/lib/server/db/schema.ts` with the full schema. Structurally, the file has seven sections:

1. **Timestamp helpers.** Three small factory functions that return column declarations: `createdAt()`, `updatedAt()` (with `$onUpdate` to auto-bump), and `nullableTimestamp(name)`. Using helpers keeps every table's timestamp columns identical.

2. **Enums** (7 total): `product_kind`, `product_status`, `price_interval`, `order_status`, `subscription_status`, `entitlement_source`, `coupon_discount_type`, `coupon_duration`. Each is a `pgEnum('...', [...])` export — enums are first-class Postgres types.

3. **Catalog** — `products`, `prices`, `product_categories`, `product_category_memberships`.

4. **Promotions** — `coupons`.

5. **Commerce** — `orders`, `order_items`, `payments`, `refunds`, `subscriptions`.

6. **Access** — `entitlements`.

7. **Coupon redemptions + cart + webhook events** — `coupon_redemptions`, `carts`, `cart_items`, `webhook_events`.

8. **Type exports.** Every table's inferred row type (and the Insert shape where we need it).

Example of the shape — the `prices` table in full:

```ts
export const prices = pgTable(
  'prices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    stripePriceId: text('stripe_price_id').notNull(),
    currency: char('currency', { length: 3 }).notNull().default('usd'),
    unitAmountCents: integer('unit_amount_cents').notNull(),
    interval: priceInterval('interval'),
    intervalCount: integer('interval_count'),
    trialPeriodDays: integer('trial_period_days'),
    active: boolean('active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (t) => [
    uniqueIndex('prices_stripe_price_id_uq').on(t.stripePriceId),
    index('prices_product_active_idx').on(t.productId, t.active)
  ]
);
```

Every table follows this shape: column declarations, then a callback returning an array of index declarations.

Foreign-key `onDelete` policies are deliberate per relation:
- **`cascade`** when the child row has no meaning without the parent (`order_items` → `orders`, `cart_items` → `carts`, `payments` → `orders`, `refunds` → `payments`, category memberships).
- **`restrict`** when the parent row must not be deletable while children exist (`order_items` → `prices` — you cannot delete a price that's been purchased; `entitlements` → `products`; `subscriptions` → `prices`; `coupon_redemptions` → `coupons`).
- **`set null`** when the link is optional (`orders.coupon_id` — deleting a coupon should not delete past orders; the historical order simply loses its coupon link).

Verify TypeScript is happy:

```bash
pnpm check
```

Expected: 0 errors. The schema compiles clean, Drizzle's type inference produces fully-typed tables, and `svelte-check` finds nothing to complain about.

## Why we chose this — the PE7 judgment

**Alternative 1: Split the schema across multiple files (one per domain)**
Tempting for larger repos. In practice, Drizzle's forward-reference pattern and the relatively flat 13-table shape in v1 don't justify the split yet. A single file is grep-able, diffs cleanly, and has obvious authority. Split into multiple files when the schema crosses ~25 tables or when a domain's tables grow independent of the rest.

**Alternative 2: Skip enums, use `text` with a check constraint**
Drizzle/Postgres enums are first-class types — changing an enum value requires a migration, and bad values fail at INSERT time with a clear error. Text-with-CHECK works but produces uglier migrations and bigger diffs. The enum discipline is worth keeping.

**Alternative 3: Use `serial` integers instead of `uuid` primary keys**
Integers are smaller (4 bytes vs 16) and indexable slightly faster. UUIDs win on two axes that matter more. First, client-safe — a UUID in a URL doesn't leak "this is order #47 in a system of ~50 orders" the way an integer does. Second, distributed-generation — a UUID can be generated on the client, in a background job, in Stripe's webhook receiver without a round-trip to the database. For a commerce app that integrates with Stripe IDs (also UUIDs-ish), UUIDs are the consistent choice.

**Alternative 4: Put timestamp columns inline on each table**
We factored `createdAt()` and `updatedAt()` into helpers. The alternative is repeating `timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()` 20+ times. Repetition looks neutral until one table drifts from the pattern by accident (maybe missing the `withTimezone`). The helper prevents drift — if the standard changes, one file does the migration.

**Alternative 5: Express relations with Drizzle's `relations` API**
Drizzle's `relations()` helper lets you declare many-to-many or polymorphic relationships that Drizzle's query builder can then traverse. We'll add this when we need it (probably in Module 5 when we build the product catalog browsing). For now, the FK references on columns are enough — type inference already understands them, and the joins we write are explicit.

The PE7 choice — a single typed file with factory-helpered timestamps, explicit FK actions, enum-first type discipline — wins because the schema file is the readable, auditable, diff-able source of truth.

## What could go wrong

**Symptom:** `pnpm check` errors with `Property 'id' does not exist on type` on a forward-referenced table
**Cause:** A foreign key references a table defined later in the file without the lazy-callback syntax.
**Fix:** Always use the arrow-function form: `.references(() => products.id)`. Drizzle resolves the reference lazily, so declaration order doesn't matter.

**Symptom:** `drizzle-kit generate` fails with `duplicate enum value`
**Cause:** An enum declared twice, or two enums share a name.
**Fix:** `pgEnum` names must be unique across the schema. Rename one or consolidate.

**Symptom:** `cannot drop table ... because other objects depend on it` when running a future migration
**Cause:** `onDelete: 'restrict'` is working as designed — Drizzle is stopping a destructive delete. That's usually correct.
**Fix:** Decide whether the parent should be deletable. If yes, the FK action should be `cascade` or `set null`, not `restrict`. If no (the default intent for most business tables), `restrict` is right and the caller must delete children first.

**Symptom:** Columns you expected to be `Date` are typed as `string`
**Cause:** Drizzle's timestamp mode is `'string'` by default. Our helpers specify `mode: 'date'` so columns come back as native JS `Date` objects.
**Fix:** Use the `createdAt()` / `updatedAt()` / `nullableTimestamp()` helpers. If you hand-roll a timestamp, match the mode.

## Verify

```bash
# File grew substantially — every table present
wc -l src/lib/server/db/schema.ts
```
Expected: ~300+ lines.

```bash
# Every v1 table is declared
for t in products prices product_categories product_category_memberships \
         orders order_items payments refunds subscriptions \
         entitlements coupons coupon_redemptions carts cart_items webhook_events; do
  grep -q "pgTable('$t'" src/lib/server/db/schema.ts && echo "found $t" || echo "MISSING $t"
done
```
Expected: 15 lines, one `found` per table.

```bash
# All 7 enums
grep -c "pgEnum(" src/lib/server/db/schema.ts
```
Expected: `8` (including coupon_discount_type and coupon_duration).

```bash
# Types are exported for downstream use
grep -E "^export type" src/lib/server/db/schema.ts | wc -l
```
Expected: 15+ type exports.

```bash
# Drizzle-kit can parse the schema
pnpm exec drizzle-kit check 2>&1 | tail -5
```
Expected: no errors. (May warn that no migrations exist yet — that's lesson 021.)

```bash
pnpm check
```
Expected: 0 errors.

## Mistake log — things that went wrong the first time I did this

- **Named the timestamp helper `timestampField()`.** Too generic — could have been confused with the Drizzle `timestamp` import. Renamed to `createdAt()` / `updatedAt()` which describe intent. Pattern: name helpers for the role they play, not the mechanism they use.
- **Set `onDelete: 'cascade'` on every foreign key by default.** Ran a test scenario: deleted a coupon, every order that had used it vanished. Revisited each FK deliberately. Settled on the 3-way split: cascade for child-of-parent relationships, restrict for business-critical references, set-null for optional links. Rule of thumb: if deleting the parent would make you wince, it's restrict.
- **Forgot the `$onUpdate(() => new Date())` on `updatedAt()` helper.** The column had `defaultNow()` on INSERT but nothing updated it on UPDATE. Queries looked correct until I noticed the `updated_at` field never changed after the first save. Added `$onUpdate` — now every row update bumps the timestamp automatically.
- **Used `text('currency')` for currency codes.** Storing "usd", "eur" as unbounded text works but is loose. Switched to `char('currency', { length: 3 })` — the ISO 4217 standard is exactly three letters. Plus a `.default('usd')` so the common case is ergonomic.
- **Declared `entitlements.revoked_at` with `.notNull().default(null)`.** `notNull().default(null)` is contradictory; Drizzle accepted it because TypeScript didn't flag the combination, but Postgres errored at migration time. Fixed to plain `timestamp(...)` (nullable by default) via the `nullableTimestamp()` helper.

## Commit this change

```bash
git add src/lib/server/db/schema.ts
git add curriculum/module-02-data/lesson-020-write-drizzle-schema.md
git commit -m "feat(db): write v1 Drizzle schema + lesson 020"
```

The schema file is now the single typed source of truth for every table, enum, and foreign-key in v1. Lesson 021 runs `drizzle-kit generate` to turn this file into the first migration SQL.
