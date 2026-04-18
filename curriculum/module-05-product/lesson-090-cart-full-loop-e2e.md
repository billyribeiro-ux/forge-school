---
number: 90
slug: cart-full-loop-e2e
title: Playwright full-loop cart → checkout → coupon E2E
module: 5
moduleSlug: product
moduleTitle: Product
phase: 5
step: 28
previous: 89
next: null
estimatedMinutes: 20
filesTouched:
  - tests/e2e/cart-full-loop.spec.ts
---

## Context

Single-product checkout got its E2E in lessons 058-060. This lesson ships the cart-flow equivalent: add an item, verify the cart page, apply a coupon, hand off to Stripe. The Stripe redirect boundary is the correct stopping point — completing the Stripe-hosted payment from Playwright is a separate test surface requiring Stripe CLI forwarding that CI doesn't guarantee.

Two tests in the file:

- **full-loop**: browse → add → cart → checkout handoff. Asserts the cart count, line items, subtotal, and that the browser reaches `checkout.stripe.com`.
- **coupon-application**: applies `WELCOME10`, asserts the 10% discount renders, removes the coupon, asserts it's gone.

## The command

`tests/e2e/cart-full-loop.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('cart full-loop: add lifetime, view cart, hand off to Stripe', async ({ page }) => {
  await page.goto('/products/forgeschool-lifetime');
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.getByRole('button', { name: /Added/ })).toBeVisible();

  await page.getByRole('link', { name: /Cart \(1 items\)/ }).click();
  await expect(page.getByRole('heading', { name: 'Your cart' })).toBeVisible();
  await expect(page.getByText('$497')).toBeVisible();

  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/cart/checkout')),
    page.getByRole('button', { name: /Checkout/ }).click()
  ]);
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15_000 });
});

test('coupon application: apply WELCOME10, see discount, remove', async ({ page }) => {
  await page.goto('/products/forgeschool-lifetime');
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await page.getByRole('link', { name: /Cart \(1 items\)/ }).click();

  await page.getByPlaceholder('Enter a code').fill('WELCOME10');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByText('WELCOME10')).toBeVisible();
  await expect(page.getByText(/10% off/)).toBeVisible();

  await page.getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByText('Discount')).not.toBeVisible();
});
```

```bash
pnpm exec playwright test tests/e2e/cart-full-loop.spec.ts
```

## Why we chose this — the PE7 judgment

**Alternative 1: Stop after the Stripe redirect is observable, never actually completing the payment.**
That's the path we take. The prior checkout specs do the same — exercising the redirect with valid params is the contract boundary. Stripe-side tests live in Stripe's own CI.

**Alternative 2: Mock Stripe with a fixture server.**
Works, but the real value of an E2E is hitting the real Stripe API once to verify our payload is shaped correctly. Mocking would silently accept a payload Stripe rejects.

**Alternative 3: Test add-to-cart on the catalog card instead of the detail page.**
The catalog card uses a CartBadge + links into the detail page (lesson 071's layout). Testing the detail page button covers the most common path.

**Alternative 4: Use `page.waitForNavigation` instead of `waitForURL`.**
`waitForURL` matches on substring; `waitForNavigation` without a predicate accepts any navigation, which would pass even on an error page. The URL pattern is the precise assertion.

The PE7 choice — **realistic flow, Stripe-redirect boundary, two independent tests** — wins on coverage without brittleness.

## What could go wrong

**Symptom:** Test times out waiting for `/cart/checkout` response
**Cause:** Cart cookie wasn't serialized before the click (debounce, lesson 070's 150ms write delay).
**Fix:** Add an explicit `await page.waitForTimeout(200)` before clicking Checkout, OR trigger a read-after-write pattern like visiting `/cart` first — which the test does. Going via `/cart` flushes the cookie before submission.

**Symptom:** Coupon test fails — the remove button's click doesn't un-apply
**Cause:** The `?/remove` form action response doesn't invalidate the page data.
**Fix:** SvelteKit's form action auto-invalidates the load when the action succeeds. If not, add `use:enhance` to the form with manual `invalidateAll()` inside the result handler.

**Symptom:** Stripe page fails with "invalid promotion code"
**Cause:** The Stripe mirror (lesson 073's `ensureStripeCoupon`) hasn't run; the DB coupon has no `stripe_coupon_id`.
**Fix:** `ensureStripeCoupon` runs inside `/cart/checkout` before session creation. If it fails, the error surfaces on the server side — the test shows the redirect failed. Audit the coupon row.

## Verify

```bash
pnpm db:reset && pnpm db:seed   # categories, coupons, personas
pnpm exec playwright test tests/e2e/cart-full-loop.spec.ts
```

Expected: both tests green in under 30 seconds.

## Mistake log

- **Used `page.locator('button:has-text("Add to cart")')`** — brittle when copy changes. Switched to `getByRole('button', { name: 'Add to cart' })`.
- **Asserted `page.url().toContain('checkout.stripe.com')` without `waitForURL`** — race condition on slow CI. Added the explicit wait.
- **Used `WELCOME` instead of `WELCOME10`** in the first draft — silent no-hit. Corrected to the actual seeded code.

## Commit

```bash
git add tests/e2e/cart-full-loop.spec.ts
git add curriculum/module-05-product/lesson-090-cart-full-loop-e2e.md
git commit -m "test(e2e): cart full-loop + coupon E2E + lesson 090"
```
