---
number: 119
slug: keyboard-nav
title: Keyboard navigation verification
module: 7
moduleSlug: polish
moduleTitle: Polish
phase: 7
step: 9
previous: 118
next: null
estimatedMinutes: 10
filesTouched:
  - docs/ACCESSIBILITY.md
---

## Context

Tab through every page from top to bottom. Every interactive element must be reachable, every Shift+Tab must reverse cleanly, focus order must match visual order, and no focus trap except inside modals (we have none yet).

## The checklist

- Landing: ForgeMark (not focusable), nav links, hero CTAs, module cards, FAQ summaries, BigCTA buttons, footer links.
- Pricing: plan cards (buttons), subscribe CTAs, footer.
- /cart: quantity inputs (number-spin), Remove, Clear cart, Checkout, coupon form, apply, remove, footer.
- /account/billing: Manage-in-Stripe button, purchase history (non-interactive).
- Contact form: name, email, message, submit, error focus after invalid submit.

## Expected outcomes

- Skip-links would help but aren't required at v1 — mount when page complexity grows.
- Focus rings visible on every element. We ship site-wide `:focus-visible` in `base.css`.
- `Enter` submits forms, `Space` toggles buttons.

## The command

Manual pass. Document findings in `docs/ACCESSIBILITY.md`.

## Why we chose this — the PE7 judgment

**Alt 1: Rely on screen-reader users to report.** Too late.
**Alt 2: Automated traversal with Playwright.** Detects reachability but not order correctness. Manual is the source of truth for focus order.

## Verify

Every element in every public page is reachable via Tab.

## Mistake log

- Pricing card CTA was `<a>` with `<button>` inside — nested interactive elements are a focus trap. Flattened to `<a>`.

## Commit

```bash
git add curriculum/module-07-polish/lesson-119-keyboard-nav.md
git commit -m "docs(a11y): keyboard nav verification + lesson 119"
```
