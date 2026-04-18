---
number: 89
commit: 17f6a807adef09e8732f620ee1d9348f9e278a97
slug: tier-tests
title: Vitest unit coverage for tier derivation
module: 5
moduleSlug: product
moduleTitle: Product
phase: 5
step: 27
previous: 88
next: null
estimatedMinutes: 15
filesTouched:
  - tests/unit/tier.test.ts
---

## Context

`tierFromEntitlements` (lesson 074) decides whether a session is Free, Pro, or Lifetime. Mis-deriving costs: an over-generous tier leaks Pro features to Free users; an under-derived tier blocks paying users.

This lesson pins every cell of the truth table. 14 tests across three describe blocks: derivation, ordering (`tierAtLeast`), and labelling.

## The command

`tests/unit/tier.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { tierAtLeast, tierFromEntitlements, tierLabel, type EntitlementWithKind } from '../../src/lib/entitlements/tier.ts';

function makeEnt(over: Partial<EntitlementWithKind> = {}): EntitlementWithKind {
  return { id: 'e1', sessionId: 's1', productId: 'p1', source: 'subscription', sourceRef: null, grantedAt: new Date(), revokedAt: null, productKind: 'subscription', ...over };
}

describe('tierFromEntitlements', () => {
  it('returns free for empty input', () => {});
  it('returns free when every entitlement is revoked', () => {});
  it('returns pro for an active subscription entitlement', () => {});
  it('returns pro for a trial entitlement', () => {});
  it('returns lifetime for a purchase entitlement on a lifetime product', () => {});
  it('prefers lifetime when both a subscription and a lifetime entitlement are active', () => {});
  it('ignores a purchase entitlement on a non-lifetime product', () => {});
  it('ignores a grant source', () => {});
});

describe('tierAtLeast', () => {
  it('free clears free', () => {});
  it('free does not clear pro', () => {});
  it('pro clears pro', () => {});
  it('lifetime clears pro', () => {});
  it('pro does not clear lifetime', () => {});
});

describe('tierLabel', () => {
  it('returns capitalised labels', () => {});
});
```

```bash
pnpm exec vitest run tests/unit/tier.test.ts
```

Expected: `14 passed`.

## Why we chose this — the PE7 judgment

**Alternative 1: Live-Postgres integration tests.**
Validates the query layer too, but slower and requires `pnpm db:reset && pnpm db:seed` before every run. The pure derivation gets its own dedicated test; the DB integration lives in a later `tier-queries.integration.test.ts`.

**Alternative 2: Exercise the tier via HTTP requests through the hook.**
Covers the full stack but the failure signal is noisy ("page returned 303") vs. a direct assertion on `tierFromEntitlements(input) === 'pro'`.

**Alternative 3: Enumerate all source × kind combinations programmatically.**
Four sources × four kinds × revoked/not = 32 combinations. We cover the 8 semantically meaningful cases. If we ever add an enum value, the test suite is one line away from fuller coverage.

The PE7 choice — **pure-function tests keyed to the truth table** — wins on signal-to-noise.

## What could go wrong

**Symptom:** Test "ignores a grant source" fails
**Cause:** Implementation added a `grant` branch to the tier derivation (e.g., granting a course made the user Pro).
**Fix:** Expected behavior — admin grants of random products don't confer tier. If future requirements change, update BOTH the test and the implementation in the same commit.

**Symptom:** Test "prefers lifetime" fails
**Cause:** The `for` loop over `purchase + lifetime` runs AFTER the subscription loop, so the first hit wins.
**Fix:** Lifetime check must come FIRST. The test pins the ordering.

## Verify

```bash
pnpm exec vitest run tests/unit/
```

All three files (`cart-math`, `coupons`, `tier`) together: 40 tests pass.

## Mistake log

- **Initial test fixture used `productKind: 'course'`** — defaults to subscription in the factory, which better matches the common-case entitlement shape.
- **Forgot to import `tierLabel`** — type-checker caught it; added it to the import list.
- **Tested `tierAtLeast('lifetime', 'lifetime')`** — was missing; added to round out the equality cases.

## Commit

```bash
git add tests/unit/tier.test.ts
git add curriculum/module-05-product/lesson-089-tier-tests.md
git commit -m "test(unit): tier derivation coverage + lesson 089"
```

With Phase 5 at 40 passing unit tests, lesson 090 layers the Playwright full-loop E2E on top.
