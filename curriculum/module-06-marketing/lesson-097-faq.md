---
number: 97
commit: 1de37dfd3ec36514ecd65569133bfe26e29fa127
slug: faq
title: Add a FAQ accordion
module: 6
moduleSlug: marketing
moduleTitle: Marketing
phase: 6
step: 6
previous: 96
next: null
estimatedMinutes: 10
filesTouched:
  - src/lib/components/marketing/FAQ.svelte
  - src/routes/+page.svelte
---

## Context

Four canonical student questions on the landing: format, divergence, Stripe prerequisites, longevity. Uses native `<details>` / `<summary>` — zero JS for open/close.

## The command

`src/lib/components/marketing/FAQ.svelte` — array of `{q, a}`, rendered as a `<details>` per question with a brand-color border when open.

Mount between modules-preview and the pe7-callout.

```bash
pnpm check
```

## Why we chose this — the PE7 judgment

**Alt 1: Framer-motion animated accordion.** `<details>` is native, zero-JS, screen-reader-correct. No reason to reinvent.
**Alt 2: Collapsed by default, animate open/close with CSS `grid-template-rows`.** Browser support is patchy; `<details>` degrades gracefully everywhere.
**Alt 3: All items open by default.** Defeats the purpose of an accordion; walls of text at first render.

## Verify

`pnpm check && pnpm build`. Click a question → panel expands, border turns brand color.

## Mistake log

- Used `<div class="faq-item">` wrappers. `<details>` IS the wrapper. Removed.
- Bound `open` state manually. The browser handles it.

## Commit

```bash
git add src/lib/components/marketing/FAQ.svelte src/routes/+page.svelte
git add curriculum/module-06-marketing/lesson-097-faq.md
git commit -m "feat(marketing): FAQ accordion on landing + lesson 097"
```
