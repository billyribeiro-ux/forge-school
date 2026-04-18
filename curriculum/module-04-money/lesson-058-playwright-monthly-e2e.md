---
number: 58
commit: a10339008dd0af923c9ef1dc72632aabd8111302
slug: playwright-monthly-e2e
title: Install Playwright and write the monthly checkout E2E
module: 4
moduleSlug: money
moduleTitle: Money
phase: 4
step: 19
previous: 57
next: null
estimatedMinutes: 20
filesTouched:
  - package.json
  - pnpm-lock.yaml
  - playwright.config.ts
  - tests/e2e/checkout-monthly.spec.ts
---

## Context

Playwright runs real browsers against our dev server. It's the test of record for "does the checkout button actually take me to Stripe?" The Vitest integration tests from lesson 026 cover DB queries; Playwright covers HTTP + DOM + navigation.

**Scoping note:** we deliberately stop the E2E at the Stripe redirect. Stripe's hosted checkout page is an iframe-heavy flow whose DOM changes monthly; automating it reliably is a dedicated project. What we can test robustly is the pre-Stripe path: `/pricing` → form POST → our endpoint → 303 redirect to `checkout.stripe.com`. Stripe-side behavior is covered by webhook handlers exercised with `stripe trigger`.

## The command

Install:

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

Create `playwright.config.ts`:

```ts
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,  // workers: 1 — Postgres state is shared
  retries: process.env['CI'] !== undefined ? 2 : 0,
  workers: 1,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true
  }
});
```

- **`fullyParallel: false` / `workers: 1`** — our tests share a single Postgres. Parallel workers would race on seeded state. For v1 we run sequentially; a future refactor can partition by session_id.
- **`reuseExistingServer: true`** — if `pnpm dev` is already running, Playwright connects to it. CI spawns a fresh one.

Write the first spec — `tests/e2e/checkout-monthly.spec.ts`:

```ts
test('pro-monthly checkout redirects to Stripe', async ({ page }) => {
  await page.goto('/pricing');
  const monthlyCard = page.locator('article.card', { hasText: 'ForgeSchool Pro — Monthly' });
  await expect(monthlyCard).toBeVisible();
  const submit = monthlyCard.locator('button[type="submit"]');

  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/checkout/forgeschool-pro-monthly')),
    submit.click()
  ]);

  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15_000 });
  expect(page.url()).toContain('checkout.stripe.com');
});
```

The test locates the monthly card by heading text, clicks the Start-checkout button, waits for our endpoint to respond, then waits for Stripe's URL. Total runtime ~5 seconds including browser start.

Add the npm script:

```diff
+  "test:e2e": "playwright test"
```

Run:

```bash
# Pre-requisites:
docker compose up -d --wait
pnpm db:reset && pnpm db:seed
# (real Stripe test keys in .env.local)

pnpm test:e2e
```

Expected: `1 passed`.

## Why we chose this — the PE7 judgment

**Alternative 1: Cypress**
Cypress and Playwright are peers. Playwright wins on parallelism, multi-browser support, and its modern TypeScript-first API. Both would work; Playwright is the default in the current SvelteKit docs.

**Alternative 2: Drive Playwright THROUGH Stripe's checkout**
Feasible with `page.frameLocator('iframe[name*=payment]')`. Brittle — Stripe's iframe structure shifts every few months. Our scope stops at the redirect.

**Alternative 3: Mock Stripe in the test**
Dev test doubles for Stripe exist (e.g., `stripe-mock`). They return fake responses without real Stripe calls. Useful for CI where real Stripe isn't accessible. Adds a lot of infrastructure for v1; defer to Module 8's CI setup.

**Alternative 4: Skip E2E entirely; rely on Vitest + manual smoke**
The manual smoke (lesson 046) exists. Automated E2E catches regressions when a dev tweaks the pricing UI and accidentally breaks the form POST. Worth the 5-second test run.

The PE7 choice — Playwright + `workers: 1` + redirect-only E2E — wins because it catches the regressions Vitest can't see without paying for iframe automation complexity.

## What could go wrong

**Symptom:** `pnpm test:e2e` errors with `browser not found`
**Cause:** Playwright's browser binaries aren't installed; `@playwright/test` package is only the test runner.
**Fix:** `pnpm exec playwright install chromium`.

**Symptom:** Test fails because port 5173 is taken
**Cause:** A dev server is already running. `reuseExistingServer: true` should handle this.
**Fix:** Stop the other dev server, or let Playwright reuse it.

**Symptom:** `waitForURL(/checkout\.stripe\.com/)` times out
**Cause:** Stripe returned an error (e.g., invalid API key, missing price) and our endpoint returned a 500 instead of a redirect.
**Fix:** Check `.env.local` has a valid `sk_test_...` secret. Run `pnpm db:reset && pnpm db:seed` to ensure products exist.

**Symptom:** Multiple tests share Postgres state and races cause flakes
**Cause:** Parallel workers. The config sets `workers: 1`.
**Fix:** Keep workers at 1. For faster CI, use the test-clock + sharded-DB pattern later.

## Verify

```bash
pnpm check
pnpm test:e2e
```
Expected: 1 passed, 0 failed.

## Mistake log — things that went wrong the first time I did this

- **Forgot to `playwright install chromium`.** First run errored. Added a note in the test script's README pointing at the command.
- **Used `waitForURL('https://checkout.stripe.com/*')` with a string glob.** Playwright's `waitForURL` takes a RegExp or string URL; the glob form isn't supported. Switched to `/checkout\.stripe\.com/`.
- **Selected the monthly card by CSS index `:nth-child(2)`.** Order depends on seed insertion order; tests shouldn't depend on row order. Selected by heading text instead — robust to reordering.
- **Set `workers: 4` for speed.** Tests passed locally; CI flaked because parallel workers hit seed data at the same time. Locked to `workers: 1`.

## Commit this change

```bash
git add package.json pnpm-lock.yaml playwright.config.ts tests/e2e/checkout-monthly.spec.ts
git add curriculum/module-04-money/lesson-058-playwright-monthly-e2e.md
git commit -m "feat(e2e): install Playwright + monthly checkout test + lesson 058"
```

Lessons 059-061 add sibling tests for yearly, lifetime, and refund flows.
