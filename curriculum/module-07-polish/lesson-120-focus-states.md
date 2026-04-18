---
number: 120
slug: focus-states
title: Focus-state audit
module: 7
moduleSlug: polish
moduleTitle: Polish
phase: 7
step: 10
previous: 119
next: null
estimatedMinutes: 10
filesTouched:
  - docs/ACCESSIBILITY.md
---

## Context

Every interactive element must render a visible focus ring. PE7 uses `:focus-visible` (not `:focus`) so keyboard users get the outline but mouse users don't see one after click.

## Policy

- Site-wide `:focus-visible { outline: 2px solid var(--color-brand); outline-offset: 2px; }` in `base.css` (already shipped).
- Components that render their own focus ring (custom controls) must preserve the token color and 2px offset.
- Never `outline: none;` without a replacement — fails WCAG 2.4.7.

## The command

Grep for `outline: none` / `outline: 0` in `src/` and verify each has a replacement focus style. At Phase 7 the only occurrences are inside form-reset patterns where `outline` is replaced by `box-shadow`.

```bash
grep -rn "outline:.*none\|outline:.*0" src/
```

## Why we chose this — the PE7 judgment

**Alt 1: Default browser focus ring.** Inconsistent across browsers; brand-colored outline matches the design system.
**Alt 2: Use `box-shadow` for all focus rings.** `outline` doesn't take layout space; `box-shadow` can cause layout shift. Prefer `outline` + `outline-offset`.

## Verify

```bash
grep -rn "outline:.*none\|outline:.*0" src/
```
Expected: only replacement-focus styles (shadow-on-focus).

## Mistake log

- `AddToCartButton`'s `:disabled` style hid the focus ring — disabled buttons shouldn't be focusable anyway; relied on browser default `tabindex` behavior.

## Commit

```bash
git add curriculum/module-07-polish/lesson-120-focus-states.md
git commit -m "docs(a11y): focus-state audit + lesson 120"
```
