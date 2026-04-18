---
number: 59
commit: a65697f1721909733d3e8cdb179ec794f10413ca
slug: yearly-e2e
title: E2E — yearly subscription checkout
module: 4
moduleSlug: money
moduleTitle: Money
phase: 4
step: 20
previous: 58
next: 60
estimatedMinutes: 5
filesTouched:
  - tests/e2e/checkout-yearly.spec.ts
---

## Context

Siblings spec — the yearly subscription's flow is identical to monthly, but the assertions differ: yearly shows a 14-day trial note vs. monthly's 7-day. Catching a regression where the trial note disappears is the test's job.

## The command

Create `tests/e2e/checkout-yearly.spec.ts`:

```ts
test('pro-yearly checkout redirects to Stripe', async ({ page }) => {
  await page.goto('/pricing');
  const yearlyCard = page.locator('article.card', { hasText: 'ForgeSchool Pro — Yearly' });
  await expect(yearlyCard).toBeVisible();
  await expect(yearlyCard.getByText(/14-day free trial/)).toBeVisible();
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/checkout/forgeschool-pro-yearly')),
    yearlyCard.locator('button[type="submit"]').click()
  ]);
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15_000 });
});
```

Verify:

```bash
pnpm test:e2e -- --grep 'pro-yearly'
```
Expected: 1 passed.

## Why we chose this — the PE7 judgment

**Alternative 1: Parameterize monthly + yearly in a single test with `test.describe.each`**
Works. Also loses the "yearly has 14-day trial" assertion specificity. Keeping siblings separate makes each test's assertion block targeted.

**Alternative 2: Skip the trial-note assertion**
The whole reason this sibling exists is the difference from monthly. Drop the assertion and the test is redundant with checkout-monthly.

## What could go wrong

**Symptom:** `14-day free trial` text not found
**Cause:** Seed lesson 043 sets `trialPeriodDays: 14` on the yearly spec; if a dev changed it, the text won't appear. Also check that `/pricing`'s rendering actually outputs "14-day free trial" — look for the `.trial` paragraph.

## Verify

```bash
pnpm test:e2e
```
All three checkout specs pass.

## Mistake log

- **Copy-pasted from monthly and left `hasText: 'Monthly'`.** Test passed by finding the monthly card, trial-text assertion failed on the wrong card. Fixed to `Yearly`.

## Commit

```bash
git add tests/e2e/checkout-yearly.spec.ts
git add curriculum/module-04-money/lesson-059-yearly-e2e.md
git commit -m "feat(e2e): yearly checkout test + lesson 059"
```
