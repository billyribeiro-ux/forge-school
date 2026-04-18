---
number: 115
slug: lighthouse-baseline
title: Lighthouse baseline measurement
module: 7
moduleSlug: polish
moduleTitle: Polish
phase: 7
step: 5
previous: 114
next: null
estimatedMinutes: 10
filesTouched:
  - docs/PERFORMANCE.md
---

## Context

Before tuning, measure. `docs/PERFORMANCE.md` now contains the baseline Lighthouse scores (Perf / A11y / BP / SEO) for three representative public pages: landing, pricing, and a lesson view. Post-polish (lesson 116) must exceed 95 everywhere.

## The command

Run Lighthouse in Chrome DevTools against `/`, `/pricing`, `/lessons/lesson-001-...`. Record the scores in `docs/PERFORMANCE.md` under the "Baseline" section.

No code changes — pure measurement.

```bash
pnpm build
pnpm exec vite preview --port 4173 &
# Open Chrome → DevTools → Lighthouse → Desktop + Mobile
```

## Why we chose this — the PE7 judgment

**Alt 1: Skip baseline; go straight to fixing.** Can't prove improvement without a before-and-after.
**Alt 2: Measure in dev mode.** Dev bundles are unoptimized; scores are artificially low. Always measure against `pnpm build`.
**Alt 3: Use WebPageTest / Calibre.** Better for regression tracking across deploys; overkill for one-shot baseline.

## Verify

`docs/PERFORMANCE.md` has a filled-in baseline table.

## Mistake log

- Ran Lighthouse against `pnpm dev` — scores misleadingly low. Re-ran against `pnpm build + preview`.

## Commit

```bash
git add docs/PERFORMANCE.md curriculum/module-07-polish/lesson-115-lighthouse-baseline.md
git commit -m "docs(perf): Lighthouse baseline + lesson 115"
```
