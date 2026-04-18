---
number: 60
commit: a65697f1721909733d3e8cdb179ec794f10413ca
slug: lifetime-e2e
title: E2E — lifetime one-time checkout
module: 4
moduleSlug: money
moduleTitle: Money
phase: 4
step: 21
previous: 59
next: 61
estimatedMinutes: 5
filesTouched:
  - tests/e2e/checkout-lifetime.spec.ts
---

## Context

The Lifetime path differs from the two subscription paths in one meaningful way: it's `mode=payment`, not `mode=subscription`. The test asserts "one-time" appears in the card (not "month" / "year") and that the same redirect contract holds.

## The command

`tests/e2e/checkout-lifetime.spec.ts`:

```ts
test('lifetime one-time checkout redirects to Stripe', async ({ page }) => {
  await page.goto('/pricing');
  const lifetimeCard = page.locator('article.card', { hasText: 'ForgeSchool — Lifetime' });
  await expect(lifetimeCard).toBeVisible();
  await expect(lifetimeCard.getByText(/one-time/)).toBeVisible();
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/checkout/forgeschool-lifetime')),
    lifetimeCard.locator('button[type="submit"]').click()
  ]);
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15_000 });
});
```

Verify:

```bash
pnpm test:e2e
```

## Why we chose this

Same reasoning as lessons 058-059: siblings with targeted assertions. The `one-time` text is what differentiates; we assert on it.

## What could go wrong

**Symptom:** `one-time` text not found
**Cause:** `formatInterval` helper in +page.svelte renders something other than `one-time` for `interval='one_time'`. Check the helper.

## Mistake log

- **Asserted on `Lifetime` as the card selector; the page actually displays "ForgeSchool — Lifetime" with an em-dash.** Locator needed the full heading.

## Commit

```bash
git add tests/e2e/checkout-lifetime.spec.ts
git add curriculum/module-04-money/lesson-060-lifetime-e2e.md
git commit -m "feat(e2e): lifetime checkout test + lesson 060"
```
