---
number: 117
commit: d3b533329c11870a0058e28a6eedb054cc3cbe8f
slug: axe-audit
title: Run an axe-core accessibility audit
module: 7
moduleSlug: polish
moduleTitle: Polish
phase: 7
step: 7
previous: 116
next: null
estimatedMinutes: 15
filesTouched:
  - docs/ACCESSIBILITY.md
  - package.json
---

## Context

`@axe-core/playwright` hooks into the existing E2E harness and scans each rendered page for WCAG 2.2 AA violations. Running against the three public surfaces (landing, pricing, a lesson page) surfaces any regressions before ship.

## The command

```bash
pnpm add -D @axe-core/playwright
```

Create `tests/e2e/a11y.spec.ts`:

```ts
import { AxeBuilder } from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

for (const path of ['/', '/pricing', '/about']) {
  test(`a11y: ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}
```

Run:
```bash
pnpm exec playwright test tests/e2e/a11y.spec.ts
```

Document any violations in `docs/ACCESSIBILITY.md` under "Known issues" — real bugs get fixed in lesson 118.

## Why we chose this — the PE7 judgment

**Alt 1: Manual screen-reader testing only.** Catches things axe misses but misses the mechanical 60% axe finds instantly.
**Alt 2: `eslint-plugin-jsx-a11y`.** Svelte doesn't use JSX; static analysis can't see the DOM tree.
**Alt 3: Skip axe, rely on Lighthouse.** Lighthouse's a11y checks are a subset of axe's.

## Verify

`pnpm exec playwright test tests/e2e/a11y.spec.ts` completes — any violations print with the WCAG rule and offending selector.

## Mistake log

- Tested against `pnpm dev` URLs — the compiled bundle has different class names than SSR. Tested against `pnpm build && preview` for parity.
- Didn't scope the axe run to a single page — default scope is `document`, which is what we want.

## Commit

```bash
git add docs/ACCESSIBILITY.md package.json pnpm-lock.yaml tests/e2e/a11y.spec.ts
git add curriculum/module-07-polish/lesson-117-axe-audit.md
git commit -m "test(a11y): axe-core automated scan + lesson 117"
```
