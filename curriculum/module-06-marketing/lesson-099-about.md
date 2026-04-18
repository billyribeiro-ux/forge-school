---
number: 99
slug: about
title: Build /about
module: 6
moduleSlug: marketing
moduleTitle: Marketing
phase: 6
step: 8
previous: 98
next: null
estimatedMinutes: 10
filesTouched:
  - src/routes/about/+page.svelte
---

## Context

Static prose page: four short sections (what, who, stack, meta). No data loading, no dynamic state.

## The command

`src/routes/about/+page.svelte` — `<main class="prose">` with header + four `<h2>` blocks. Shared `.prose` styles (max-inline-size 48rem, relaxed line-height) — future legal pages reuse the same class pattern.

```bash
pnpm check && pnpm build
```

## Why we chose this — the PE7 judgment

**Alt 1: Generate the About page from a markdown file under `content/`.** Would match the curriculum-in-markdown pattern but overkill for five pages.
**Alt 2: Skip the page, link only to GitHub.** Marketing pages that 404 erode trust.

## Verify

`pnpm check && pnpm build`. Visit `/about`.

## Mistake log

- Added too many H2s — a one-page About should cover the essentials, not be exhaustive.

## Commit

```bash
git add src/routes/about/
git add curriculum/module-06-marketing/lesson-099-about.md
git commit -m "feat(routes): /about + lesson 099"
```
