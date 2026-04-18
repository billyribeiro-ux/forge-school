---
number: 125
slug: critical-path-e2e
title: Critical-path Playwright smoke suite
module: 8
moduleSlug: ship
moduleTitle: Ship
phase: 8
step: 1
previous: 124
next: null
estimatedMinutes: 15
filesTouched:
  - tests/e2e/critical-path.spec.ts
---

## Context

Checkout E2Es (lessons 058-060) exercise Stripe. Cart full-loop (lesson 090) exercises the cart. This suite is the fast smoke that every CI run shoulders: every public page returns 200, `/account` renders for an unentitled session, sitemap + robots serve correctly.

Under 2 seconds on a developer laptop; the build gate that stops obvious breakage from shipping.

## The command

`tests/e2e/critical-path.spec.ts`:

```ts
const PUBLIC_PATHS = ['/', '/pricing', '/products', '/about', '/support', '/contact', '/terms', '/privacy', '/refund-policy', '/cookie-notice', '/lessons'];
for (const path of PUBLIC_PATHS) {
  test(`GET ${path} returns 200`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
  });
}

test('account dashboard renders for unentitled session', async ({ page }) => {
  await page.goto('/account');
  await expect(page.getByRole('heading', { name: 'Your account' })).toBeVisible();
  await expect(page.getByText('Free')).toBeVisible();
});

test('sitemap.xml returns XML', async ({ page }) => { /* content-type check */ });
test('robots.txt includes Disallow: /admin', async ({ request }) => { /* body check */ });
```

```bash
pnpm exec playwright test tests/e2e/critical-path.spec.ts
```

## Why we chose this — the PE7 judgment

**Alt 1: Skip smoke; rely on unit + integration.** Smoke covers compositional failures unit tests miss (e.g., a route that 500s at runtime due to env misconfiguration).
**Alt 2: Test every page for every interaction.** Too slow for every CI push. Critical-path is the 80/20.

## Verify

Suite passes locally with `pnpm db:reset && pnpm db:seed` fresh.

## Mistake log

- Used `response.ok()` — passes for 301 redirects. Tightened to exact-200 for deterministic smoke.

## Commit

```bash
git add tests/e2e/critical-path.spec.ts curriculum/module-08-ship/lesson-125-critical-path-e2e.md
git commit -m "test(e2e): critical-path smoke suite + lesson 125"
```
