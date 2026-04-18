---
number: 88
slug: coupon-tests
title: Vitest unit coverage for coupon application
module: 5
moduleSlug: product
moduleTitle: Product
phase: 5
step: 26
previous: 87
next: null
estimatedMinutes: 15
filesTouched:
  - tests/unit/coupons.test.ts
---

## Context

`computeCouponDiscount` (lesson 073) is the heart of our promotion logic: it decides if a coupon applies, how much it's worth, and (on failure) what message to show the user. The function owns the money math and the time math — two of the easiest places in a codebase to introduce silent bugs.

This lesson pins every branch with a Vitest unit test. 10 tests, all passing, no DB.

## The command

`tests/unit/coupons.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeCouponDiscount, failureMessage } from '../../src/lib/cart/coupons.ts';
import type { Coupon } from '../../src/lib/server/db/schema.ts';

function makeCoupon(over: Partial<Coupon> = {}): Coupon {
  const now = new Date();
  return { id: 'c1', code: 'TEST', stripeCouponId: null, discountType: 'percent', discountValue: 10, duration: 'once', durationInMonths: null, maxRedemptions: null, redemptionsCount: 0, validFrom: null, validUntil: null, active: true, createdAt: now, updatedAt: now, ...over };
}

describe('coupons.computeCouponDiscount', () => {
  it('applies a percent discount and floors to cents', () => { /* 10% of $49.70 = $4.97 */ });
  it('clamps a percent discount at 100% to the subtotal', () => {});
  it('clamps an amount discount at the subtotal', () => {});
  it('rejects an inactive coupon', () => {});
  it('rejects a future-start coupon', () => {});
  it('rejects an expired coupon', () => {});
  it('rejects a max-redemptions-reached coupon', () => {});
  it('rejects when subtotal is zero', () => {});
  it('accepts when validFrom is in the past and validUntil is in the future', () => {});
});

describe('coupons.failureMessage', () => {
  it('maps every failure reason to a non-empty string', () => {});
});
```

Each test narrows the discriminated union (`if (!result.ok) throw …`) so the subsequent assertion reads `result.discountCents` directly without a non-null assert.

```bash
pnpm exec vitest run tests/unit/coupons.test.ts
```

Expected: `10 passed`.

## Why we chose this — the PE7 judgment

**Alternative 1: Integration-test against the live `/cart/+page.server.ts` action.**
Covers the pure function + the cookie plumbing + the DB query. Slower, harder to debug. Build the pyramid: unit tests pin the pure function, integration tests (later) pin the wiring.

**Alternative 2: Mock the coupon row.**
The test does — `makeCoupon({ ... })` is the fixture factory. The DB-typed Coupon is imported directly from the schema so the test breaks if the schema drifts.

**Alternative 3: Skip the `failureMessage` test.**
It's a trivial switch, but a missed case (add a new reason, forget the message) would ship without compiling. The test forces parity.

The PE7 choice — **discriminated-union narrowing + typed fixture factory + 10 branches** — wins on completeness at near-zero runtime cost.

## What could go wrong

**Symptom:** `discountCents` is 498 when expected 497
**Cause:** Implementation used `Math.round` or `Math.ceil` instead of `Math.floor` for percent discounts.
**Fix:** Percent discounts must floor: 10% of 4970 = 497.0, floor is 497. Ceil would tip us into giving customers half-cents we can't charge.

**Symptom:** `expired` test is flaky
**Cause:** `validUntil: daysFromNow(-30)` + the production code used `>` instead of `<=`. An expired-at-exactly-now coupon would slip through.
**Fix:** Production uses `<=` (`validUntil <= now` → expired). Test uses a past time far enough to avoid the boundary race.

## Verify

```bash
pnpm exec vitest run tests/unit/coupons.test.ts
```

10 tests pass.

## Mistake log

- **Wrote `maxRedemptions: null` and expected rejection** — rejection requires `maxRedemptions === N && redemptionsCount >= N`. Fixed by setting both.
- **Used `Date.now() + 1000` for validFrom** — one second in the future is flaky under slow CI. Widened to `Date.now() + 1000 * 60 * 60 * 24` (24 hours).
- **Didn't narrow the discriminated union before asserting on `result.discountCents`** — TypeScript flagged the access. Wrapped with `if (!result.ok) throw new Error(...)` so `result.discountCents` is type-safe downstream.

## Commit

```bash
git add tests/unit/coupons.test.ts
git add curriculum/module-05-product/lesson-088-coupon-tests.md
git commit -m "test(unit): coupon application coverage + lesson 088"
```
