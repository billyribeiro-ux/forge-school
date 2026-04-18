---
number: 96
slug: stack-grid
title: Add "The stack" pill grid
module: 6
moduleSlug: marketing
moduleTitle: Marketing
phase: 6
step: 5
previous: 95
next: null
estimatedMinutes: 10
filesTouched:
  - src/lib/components/marketing/StackGrid.svelte
  - src/routes/+page.svelte
---

## Context

Eight pill cards naming the locked stack (SvelteKit 2, Svelte 5 runes, TypeScript strict, Postgres 16, Drizzle, Stripe, Playwright, Vitest). Sells the PE7 promise visually.

## The command

`src/lib/components/marketing/StackGrid.svelte` — eight pills in a responsive grid. Each pill animates in with a 40ms stagger.

Mount between `<ValueProp />` and the modules-preview section.

```bash
pnpm check && pnpm build
```

## Why we chose this — the PE7 judgment

**Alt 1: Logos-only wall.** Pretty, but many of the stack items (TS strict, OKLCH tokens) aren't logos.
**Alt 2: Long comparison table.** Too dense for a landing beat.
**Alt 3: Mention the stack only in `/about`.** Visitors want to see the stack on the homepage before clicking through.

## Verify

`pnpm check && pnpm build` → 0 errors. Hover a pill → brand-color border.

## Mistake log

- Started with 12 pills — too many for a pill grid's visual weight. Trimmed to 8 load-bearing choices.

## Commit

```bash
git add src/lib/components/marketing/StackGrid.svelte src/routes/+page.svelte
git add curriculum/module-06-marketing/lesson-096-stack-grid.md
git commit -m "feat(marketing): StackGrid on landing + lesson 096"
```
