---
number: 87
slug: cart-math-tests
title: Vitest unit coverage for cart arithmetic
module: 5
moduleSlug: product
moduleTitle: Product
phase: 5
step: 25
previous: 86
next: null
estimatedMinutes: 15
filesTouched:
  - tests/unit/cart-math.test.ts
---

## Context

`src/lib/cart/cart-math.ts` (lesson 069) is 80 lines of pure function. Every function has a narrow contract — `subtotalCents` sums, `addOrIncrement` merges or appends, `assertSingleCurrency` throws on mismatch. This lesson ships exhaustive unit coverage so those contracts never drift.

Tests run against the pure module — zero Drizzle, zero Svelte, zero Postgres. Vitest completes the suite in under 1 second.

## The command

`tests/unit/cart-math.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { addOrIncrement, assertSingleCurrency, lineItemTotalCents, removeItem, setQuantity, subtotalCents, totalQuantity, type CartLineItem } from '../../src/lib/cart/cart-math.ts';

function makeItem(over: Partial<CartLineItem> = {}): CartLineItem {
  return { priceId: 'price_1', productSlug: 'forgeschool-lifetime', productName: 'ForgeSchool Lifetime', unitAmountCents: 49700, currency: 'usd', quantity: 1, ...over };
}

describe('cart-math', () => {
  describe('lineItemTotalCents', () => {
    it('multiplies unit amount by quantity', () => expect(lineItemTotalCents(makeItem({ unitAmountCents: 2500, quantity: 3 }))).toBe(7500));
    it('returns 0 when quantity is 0', () => expect(lineItemTotalCents(makeItem({ quantity: 0 }))).toBe(0));
  });
  // subtotalCents, totalQuantity, assertSingleCurrency, addOrIncrement, setQuantity, removeItem — 16 tests total
});
```

```bash
pnpm exec vitest run tests/unit/cart-math.test.ts
```

Expected: `16 passed`.

## Why we chose this — the PE7 judgment

**Alternative 1: Snapshot tests.**
Snapshots encode CURRENT behavior, not desired behavior. When a regression slips in, a snapshot test "fails" in a way that invites the developer to update the snapshot rather than fix the bug. Explicit `expect(…).toBe(…)` keeps the contract visible.

**Alternative 2: Property-based tests (fast-check).**
Pays off for complex invariants. Cart math's invariants are narrow enough to enumerate by hand; fast-check would be overkill for v1.

**Alternative 3: Run tests against the reactive `cart.svelte.ts` module.**
Runs would require a Svelte testing harness. The math lives behind the rune — testing the pure module is the equivalent, at much lower cost.

**Alternative 4: Skip the immutability check in `addOrIncrement`.**
A drift toward in-place mutation would break the reactive cart invisibly. The `expect(next).not.toBe(items)` assertion guards the shape.

The PE7 choice — **direct, typed unit tests against the pure module, 16 cases covering every branch** — wins on reliability and regression-diagnosis speed.

## What could go wrong

**Symptom:** `Tests: 0 passed` — suite isn't picked up
**Cause:** `include` pattern in `vitest.config.ts` is `['src/**/*.{test,spec}.ts', 'tests/**/*.{test,spec}.ts']` — test file must be in one of those globs and end with `.test.ts`.
**Fix:** Name the file `cart-math.test.ts`, not `cart-math.spec.ts.tsx`.

**Symptom:** `cannot find module '../../src/lib/cart/cart-math.ts'`
**Cause:** TS path alias `$lib` not resolved in Vitest.
**Fix:** Either configure path aliases in `vitest.config.ts` or use relative imports. Tests use the relative path to avoid pulling Vite's svelte-kit sync step.

**Symptom:** `addOrIncrement` test "does not mutate input" fails
**Cause:** Implementation does `items.push(item)` somewhere.
**Fix:** Always return a new array.

## Verify

```bash
pnpm exec vitest run tests/unit/cart-math.test.ts
```

16 tests pass in under a second.

## Mistake log

- **Typed `items: CartLineItem[]` in the test fixture** — the production signature is `readonly CartLineItem[]`. Matching the `readonly` caught a potential mutation bug in `addOrIncrement` that strict readonly would have flagged.
- **Expected `removeItem([], 'nope')` to throw** — it doesn't; no-op is the intended behavior.
- **Tested `setQuantity(items, id, -5)` expecting removal** — any non-positive quantity triggers removal. The test now uses exactly 0 to match the documented threshold.

## Commit

```bash
git add tests/unit/cart-math.test.ts
git add curriculum/module-05-product/lesson-087-cart-math-tests.md
git commit -m "test(unit): cart math coverage + lesson 087"
```
