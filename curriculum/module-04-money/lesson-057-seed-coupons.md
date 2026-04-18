---
number: 57
slug: seed-coupons
title: Seed 12 coupon states covering the Stripe discount matrix
module: 4
moduleSlug: money
moduleTitle: Money
phase: 4
step: 18
previous: 56
next: 58
estimatedMinutes: 10
filesTouched:
  - scripts/seed-coupons.ts
  - scripts/seed-dev.ts
---

## Context

Stripe's coupon primitive has four axes:
- **Discount type** — percent or amount (cents off)
- **Duration** — once, repeating (N months), forever
- **Max redemptions** — unlimited, capped, already exhausted
- **Validity window** — always, bounded, past, future

A full UI for coupon selection / validation needs to handle every combination. This lesson seeds **12 coupon rows** covering the matrix: four percent variations, three amount variations, one expired, one max-redemptions-reached, one inactive, one with a future start date.

Like personas (lesson 056), these are DB-only. The cart-coupon flow (Module 5) wires Stripe-side coupons; for now they populate the admin view + a future coupon picker UI.

## The command

Create `scripts/seed-coupons.ts` — a `CouponSpec[]` array plus a `seedCoupons(db)` function that upserts each on `coupons.code`.

```ts
const coupons: CouponSpec[] = [
  { code: 'WELCOME10',    discountType: 'percent', discountValue: 10, duration: 'once', ... },
  { code: 'QUARTERLY25',  discountType: 'percent', discountValue: 25, duration: 'repeating', durationInMonths: 3, ... },
  { code: 'INSIDER50',    discountType: 'percent', discountValue: 50, duration: 'forever', maxRedemptions: 100, redemptionsCount: 12, ... },
  { code: 'FIRSTFREE',    discountType: 'percent', discountValue: 100, ... },
  { code: 'SAVE5',        discountType: 'amount',  discountValue: 500,   ... },
  { code: 'SAVE25',       discountType: 'amount',  discountValue: 2500,  ... },
  { code: 'BIG100',       discountType: 'amount',  discountValue: 10000, maxRedemptions: 10, ... },
  { code: 'MONTHLY10OFF', discountType: 'amount',  discountValue: 1000, duration: 'repeating', durationInMonths: 6, ... },
  { code: 'EXPIRED',      discountType: 'percent', discountValue: 30, validFrom: -60d, validUntil: -30d, ... },
  { code: 'LIMITED',      discountType: 'percent', discountValue: 40, maxRedemptions: 10, redemptionsCount: 10, ... },
  { code: 'PAUSED',       discountType: 'percent', discountValue: 20, active: false, ... },
  { code: 'LAUNCH2027',   discountType: 'amount',  discountValue: 5000, validFrom: +180d, validUntil: +270d, ... }
];
```

Cents everywhere, per our data-model rule. `discountValue` of `10` on a percent coupon means 10%; on an amount coupon it'd be 10 cents. The schema column is plain integer; semantics depend on `discount_type`.

Insert with `onConflictDoUpdate` on `coupons.code` so re-running seeds updates existing rows instead of failing.

Wire into `seed-dev.ts`:

```diff
+import { seedCoupons } from './seed-coupons.ts';

 await seedProducts(db);
+await seedCoupons(db);
 await seedPersonas(db);
```

Verify:

```bash
pnpm db:reset && pnpm db:seed
docker exec forgeschool-postgres psql -U forgeschool -d forgeschool \
  -c "SELECT code, discount_type, discount_value, duration, active FROM coupons ORDER BY code;"
```
Expected: 12 rows.

## Why we chose this — the PE7 judgment

**Alternative 1: Fewer coupons, add more as the UI needs them**
Seeding the full matrix upfront catches UI bugs as they're written. A developer building the coupon picker sees every edge case (expired, maxed, future-start) without manually creating each one.

**Alternative 2: Generate random coupons with Faker**
Random discount values produce unpredictable totals — UI bugs are hard to isolate. Named coupons with stable codes ("SAVE25 = $25 off") are easy to think about.

**Alternative 3: Sync real Stripe coupons via `stripe.coupons.create`**
Module 5's cart-coupon flow will do this. For UI seeding, DB-only is faster and doesn't require Stripe round-trips.

The PE7 choice — 12 deterministic DB-only coupons covering the matrix — wins because it's the minimum set that exercises every branch of the future coupon UI.

## What could go wrong

**Symptom:** `pnpm db:seed` errors on `duration_in_months cannot be null` for duration='repeating'
**Cause:** Stripe's API (and our schema) requires `duration_in_months` when `duration='repeating'`. A repeating coupon with null months is invalid.
**Fix:** Set `durationInMonths: 3` (or whatever period) for every `duration: 'repeating'` entry. Schema-level CHECK constraints would catch this at DB level too; consider adding one.

**Symptom:** Expired coupon's `validUntil` is in the future
**Cause:** Typo in the date helper (e.g., `daysFromNow(30)` instead of `daysFromNow(-30)`).
**Fix:** Negative days are past, positive days are future. The helper is just `new Date(Date.now() + days * 86400000)`.

## Verify

```bash
pnpm db:reset && pnpm db:seed
```
Expected output ends with "[seed]   ✓ 12 coupons" + personas line.

```bash
docker exec forgeschool-postgres psql -U forgeschool -d forgeschool -c \
  "SELECT count(*) FILTER (WHERE active) AS active_count,
          count(*) FILTER (WHERE NOT active) AS inactive_count,
          count(*) FILTER (WHERE valid_until < now()) AS expired_count,
          count(*) FILTER (WHERE redemptions_count >= max_redemptions) AS maxed_count
   FROM coupons;"
```
Expected: 11 active, 1 inactive, 1 expired, 1 maxed.

## Mistake log — things that went wrong the first time I did this

- **Confused `discount_value=10` as 10 cents on a percent coupon.** The discount_type disambiguates; for percent, `10` means 10%. Comment in the seed spec to make the intent clear.
- **Forgot `onConflictDoUpdate` on coupons.** First re-run failed with unique-constraint violation on `code`. Added the conflict target + set clause.
- **Set `maxRedemptions: 100, redemptionsCount: 100` to test the max-reached branch, but used a different code than LIMITED.** Consolidated: LIMITED is the "maxed" persona; all other maxRedemptions set to 100 are "capped but not maxed."
- **Used UTC midnight for valid_from / valid_until but Postgres stored them in the server's local timezone.** The schema already declares `timestamptz`; Drizzle + postgres.js handle the conversion. No code change needed once I confirmed the schema shape.

## Commit this change

```bash
git add scripts/seed-coupons.ts scripts/seed-dev.ts
git add curriculum/module-04-money/lesson-057-seed-coupons.md
git commit -m "feat(seed): 12 coupon states + lesson 057"
```

The dev DB is now realistically populated. Lessons 058-061 install Playwright and write E2E tests for the four commerce paths.
