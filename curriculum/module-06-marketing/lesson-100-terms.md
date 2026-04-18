---
number: 100
slug: terms
title: Build /terms
module: 6
moduleSlug: marketing
moduleTitle: Marketing
phase: 6
step: 9
previous: 99
next: null
estimatedMinutes: 10
filesTouched:
  - src/routes/terms/+page.svelte
---

## Context

Standard terms of service. Five sections (access, refunds, acceptable use, liability, contact). Reuses the `.prose` class pattern from `/about`.

## The command

`src/routes/terms/+page.svelte` with header, short lede, and five `<h2>` blocks. Dynamically renders today's date as the "Last updated" stamp — acceptable for v1, will rotate to a fixed date when we push static copy through a CMS later.

```bash
pnpm check
```

## Why we chose this — the PE7 judgment

**Alt 1: Outsource to a ToS-generator.** Fine, but you still have to read and own the copy.
**Alt 2: Embed a markdown file via mdsvex.** Works but for 5 paragraphs the Svelte file is faster to read.

## Verify

`pnpm check && pnpm build`. Visit `/terms`.

## Mistake log

- First draft omitted the "Last updated" line — users scan for it.

## Commit

```bash
git add src/routes/terms/
git add curriculum/module-06-marketing/lesson-100-terms.md
git commit -m "feat(routes): /terms + lesson 100"
```
