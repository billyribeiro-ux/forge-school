---
number: 56
slug: seed-personas
title: Seed 12 billing personas for UI coverage
module: 4
moduleSlug: money
moduleTitle: Money
phase: 4
step: 17
previous: 55
next: 57
estimatedMinutes: 15
filesTouched:
  - scripts/seed-personas.ts
  - scripts/seed-dev.ts
---

## Context

`/account/billing` needs to look right in every state a real user might see: trialing, active, about-to-cancel, past-due, refunded, partially-refunded, cancelled. Without realistic fixture data, the page renders as three near-empty cards and we can't catch layout bugs, status-pill color errors, or pluralization mistakes before they hit users.

This lesson extends the seed with **12 synthetic personas** — 9 subscription personas + 3 purchase personas — each seeded as DB rows with fake-but-plausible Stripe IDs (`sub_test_persona_*`, `cs_test_persona_*`). The rows are DB-only; they don't exist in Stripe. That's fine because this seed is for UI visual coverage, not webhook end-to-end testing.

## The command

Create `scripts/seed-personas.ts`. Two persona tables:

```ts
const subscriptionPersonas = [
  { label: 'trialing-fresh',       productSlug: 'forgeschool-pro-monthly', status: 'trialing', ... },
  { label: 'trialing-ending-soon', productSlug: 'forgeschool-pro-monthly', status: 'trialing', periodDaysFromNow: 2, ... },
  { label: 'active-monthly',       productSlug: 'forgeschool-pro-monthly', status: 'active',   ... },
  { label: 'active-yearly',        productSlug: 'forgeschool-pro-yearly',  status: 'active',   ... },
  { label: 'cancel-at-period-end', productSlug: 'forgeschool-pro-monthly', status: 'active',   cancelAtPeriodEnd: true, ... },
  { label: 'past-due',             productSlug: 'forgeschool-pro-monthly', status: 'past_due', ... },
  { label: 'cancelled-grace',      productSlug: 'forgeschool-pro-monthly', status: 'cancelled', ... },
  { label: 'unpaid',               productSlug: 'forgeschool-pro-monthly', status: 'unpaid',   ... },
  { label: 'paused',               productSlug: 'forgeschool-pro-yearly',  status: 'paused',   ... }
];

const purchasePersonas = [
  { label: 'lifetime-owner',        daysAgo: 30,  refund: null },
  { label: 'lifetime-refunded',     daysAgo: 60,  refund: { amountCents: 49700, reason: 'requested_by_customer' } },
  { label: 'lifetime-partial-ref',  daysAgo: 90,  refund: { amountCents: 10000, reason: 'goodwill' } }
];
```

Each persona has a stable label that becomes its `session_id` (`persona-<label>`) so the billing page can be viewed by opening DevTools, overwriting the `forge_session` cookie with the persona's session id, and reloading.

Subscription personas write into `subscriptions`, and (for active-ish states) into `entitlements`. Purchase personas write into `orders` + `payments` (+ optionally `refunds`) + `entitlements` (with `revoked_at` set on full refunds).

Stripe IDs are synthetic: `sub_test_persona_<label>`, `cus_test_persona_<label>`, `cs_test_persona_<label>`, `pi_test_persona_<label>`, `re_test_persona_<label>`. Real Stripe would reject these IDs, but `/account/billing` never calls Stripe — it reads from our DB.

Extend `scripts/seed-dev.ts` to call `seedPersonas(db)` after `seedProducts(db)`:

```diff
+import { seedPersonas } from './seed-personas.ts';

 await seedProducts(db);
+await seedPersonas(db);
```

Verify:

```bash
pnpm db:reset && pnpm db:seed
docker exec forgeschool-postgres psql -U forgeschool -d forgeschool \
  -c "SELECT count(*) FROM subscriptions; SELECT count(*) FROM orders WHERE session_id LIKE 'persona-%';"
```
Expected: 9 subscriptions; 3 persona orders.

To view a specific persona's billing page:
1. Open DevTools → Application → Cookies.
2. Edit `forge_session` to `persona-past-due` (or any persona label).
3. Navigate to `/account/billing` — the page renders that persona's state.

## Why we chose this — the PE7 judgment

**Alternative 1: Use Stripe's test clocks to generate real subscription states**
Stripe offers test clocks — simulated time that advances through billing cycles. Gives you real Stripe objects in every state. Also takes minutes to set up per persona and requires the scripts to wait for Stripe's API responses. DB-only personas populate in milliseconds and fully exercise our UI.

**Alternative 2: Use Faker / Chance / factory-bot-style libraries**
Random data hides bugs that only show up with specific data shapes. Named personas are reproducible — "did `past-due` look right?" is a specific answer. Faker's "generic subscription #12345" isn't.

**Alternative 3: Fewer personas (3-5)**
9 subscription + 3 purchase covers every UI branch the billing page has: trial types, active types, pre-cancel, post-cancel, payment-failure, partial-vs-full refund, yearly vs monthly. Fewer misses branches.

**Alternative 4: Seed personas in a separate pnpm script (`db:seed-personas`)**
Two commands to run after reset. The marginal cost of including personas in the main `db:seed` is ~100ms; the marginal cost of a second command is a student forgetting to run it. Integrate into `db:seed`.

The PE7 choice — 12 deterministic personas as DB-only fixtures, integrated into `db:seed` — wins because it's reproducible, fast, and covers every UI state without touching Stripe's API.

## What could go wrong

**Symptom:** `db:seed` fails on duplicate key constraint
**Cause:** A persona's synthetic ID collides with a previously-seeded row. The `onConflictDoUpdate` / `onConflictDoNothing` clauses should prevent this; missing one creates a violation.
**Fix:** Confirm every insert has a conflict target matching a unique constraint.

**Symptom:** Billing page shows 0 subscriptions even after setting cookie to `persona-active-monthly`
**Cause:** Cookie path mismatch (must be `/`) or Domain mismatch.
**Fix:** Cookie domain should be unset (defaults to current host); path `/`. Reload after editing.

**Symptom:** Drizzle errors on insert — "value cannot be cast to enum"
**Cause:** A persona's `status` string doesn't match the `subscription_status` enum (e.g., typo "cancled").
**Fix:** The enum values are: trialing, active, past_due, cancelled, unpaid, paused. Match exactly.

## Verify

```bash
pnpm db:reset && pnpm db:seed
```
Expected: "[seed]   ✓ 12 personas (9 subscriptions + 3 purchases)".

```bash
docker exec forgeschool-postgres psql -U forgeschool -d forgeschool -c \
  "SELECT session_id, status, trial_end FROM subscriptions ORDER BY session_id;"
```
Expected: 9 rows, mix of statuses.

```bash
# UI check in browser
pnpm dev
# Edit cookie 'forge_session' to 'persona-past-due'
# /account/billing renders with status pill showing "past due"
```

## Mistake log — things that went wrong the first time I did this

- **Used `'canceled'` (one l) in one persona and `'cancelled'` in another.** The enum is `cancelled` (British spelling); Stripe itself uses `canceled` (American). Our schema settled on `cancelled`; fixed the persona typo. Cross-referenced the mapping with subscription-lifecycle.ts.
- **Granted entitlements for `paused` subscriptions.** Paused subscriptions are a customer-initiated pause — access should be paused too. Removed `paused` from the `['trialing', 'active', 'past_due']` active-states list.
- **Didn't mark refunded purchases' entitlements as revoked.** The `lifetime-refunded` persona kept active access. Conditional `revokedAt` write fixed it; the partial-refund persona still has active access (correct).
- **Hardcoded 30/365-day periods in milliseconds.** Replaced with a `daysFromNow(n)` helper. Reads as "7 days from now" instead of "604800000ms from the epoch."

## Commit this change

```bash
git add scripts/seed-personas.ts scripts/seed-dev.ts
git add curriculum/module-04-money/lesson-056-seed-personas.md
git commit -m "feat(seed): 12 billing personas for UI coverage + lesson 056"
```

Lesson 057 adds the coupon equivalent — 12 coupon states covering the full Stripe discount matrix.
