---
number: 118
slug: a11y-fixes
title: Fix accessibility violations surfaced by the audit
module: 7
moduleSlug: polish
moduleTitle: Polish
phase: 7
step: 8
previous: 117
next: null
estimatedMinutes: 15
filesTouched:
  - docs/ACCESSIBILITY.md
---

## Context

Axe's first pass reports three classes of issue across the app. None of them are showstoppers — all fixable with targeted markup changes. Pattern-level fixes propagate through the whole codebase automatically because the same components (`CartBadge`, `AddToCartButton`, `SiteNav`) render in dozens of places.

## Typical findings and the pattern-level fixes

1. **`button` without accessible name** — fixed by adding `aria-label` to icon-only buttons. `CartBadge` already has `aria-label="Cart ({cart.quantity} items)"`.
2. **Heading hierarchy skipped** — e.g., `<h1>` followed by `<h3>`. We audit per-page and correct to sequential.
3. **`form` without `<label>`** — every form input already has either an inline `<label>` or an `sr-only` one. The contact form re-checks.
4. **Color contrast below 4.5:1** — the `--color-fg-subtle` token was 3.8:1 against `--color-bg`; bumped to 4.6:1 via the tokens file.

## The command

Where found, tighten the markup. Document the remaining edge cases in `docs/ACCESSIBILITY.md`. The axe suite in lesson 117 is the regression net — any future PR that regresses accessibility fails CI.

```bash
pnpm check
```

## Why we chose this — the PE7 judgment

**Alt 1: Skip WCAG AA — aim for A.** The PE7 standard is AA.
**Alt 2: Use `aria-label` everywhere for safety.** Screen readers read labels twice when both `aria-label` and visible text exist. Prefer visible text; reach for `aria-label` only when the element is icon-only.

## Verify

Re-run the axe suite → zero violations.

## Mistake log

- Added `aria-label="Cart"` to the cart badge that also had visible text "Cart" — screen readers double-announced. Kept only the item-count label.
- Set `role="button"` on an `<a>` — SPA noise; an `<a href>` is already a link role, and changing it loses keyboard semantics.

## Commit

```bash
git add docs/ACCESSIBILITY.md curriculum/module-07-polish/lesson-118-a11y-fixes.md
git commit -m "docs(a11y): fix audit findings + lesson 118"
```
