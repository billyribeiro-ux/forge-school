---
number: 140
slug: axe-spec
title: Install @axe-core/playwright + ship the a11y E2E spec
module: 9
moduleSlug: followup
moduleTitle: v1.0 Follow-up
phase: 9
step: 5
previous: 139
next: null
estimatedMinutes: 10
filesTouched:
  - package.json
  - pnpm-lock.yaml
  - tests/e2e/a11y.spec.ts
---

## Context

Lesson 117 documented the axe policy. PROMPT step 118 ships it: install `@axe-core/playwright` + add the `tests/e2e/a11y.spec.ts` that loops every public path and asserts zero WCAG 2.2 AA violations.

## The command

```bash
pnpm add -D @axe-core/playwright
```

`tests/e2e/a11y.spec.ts`:

```ts
import { AxeBuilder } from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

const PUBLIC_PATHS = ['/', '/pricing', '/products', '/about', '/support', '/contact', '/terms', '/privacy', '/refund-policy', '/cookie-notice', '/cart'] as const;

for (const path of PUBLIC_PATHS) {
  test(`a11y ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations, `${path}: ${results.violations.map(v => v.id).join(', ')}`).toEqual([]);
  });
}
```

```bash
pnpm exec playwright test tests/e2e/a11y.spec.ts
```

## Why we chose this — the PE7 judgment

**Alt 1: Test each page in its own spec file.** 11 spec files for one assertion each. The `for…of` form keeps it terse + makes adding a path one line.
**Alt 2: Scan the whole sitemap dynamically.** Brittle — sitemap changes drag the suite into surprise routes. Explicit list = explicit contract.
**Alt 3: Use only `wcag2aa` tag.** WCAG 2.2 AA is current; pinning the older tag misses new rules.

## What could go wrong

**Symptom:** Spec hangs against `/cart` because the cart relies on the persistence cookie, which isn't set in a fresh Playwright context
**Cause:** No issue — `/cart` renders the empty-cart state without a cookie.
**Fix:** Empty state has its own a11y profile (no quantity inputs, no remove buttons). Still passes axe.

**Symptom:** Spec fails on `/products` because the catalog needs DB-loaded products
**Cause:** Empty catalog renders correctly; axe ignores empty grids.
**Fix:** For best signal, run after `pnpm db:reset && pnpm db:seed`.

## Verify

```bash
pnpm exec playwright test tests/e2e/a11y.spec.ts
```

Expected: 11 tests pass.

## Mistake log

- Used `.exclude('script')` to skip noscript tags — defaults already exclude them.
- Forgot the failure-message argument on `expect()` — first failure showed only "expected [Object] to deeply equal []". Adding the path + violation IDs makes the failure self-explanatory.

## Commit

```bash
git add package.json pnpm-lock.yaml tests/e2e/a11y.spec.ts
git add curriculum/module-09-followup/lesson-140-axe-spec.md
git commit -m "test(a11y): @axe-core/playwright + per-page spec + lesson 140"
```
