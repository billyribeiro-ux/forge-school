---
number: 114
commit: c57bda87b64272040d7fdf7d60b7e752ec41a7c3
slug: code-splitting
title: Code-splitting + prefetch audit
module: 7
moduleSlug: polish
moduleTitle: Polish
phase: 7
step: 4
previous: 113
next: null
estimatedMinutes: 10
filesTouched:
  - docs/PERFORMANCE.md
---

## Context

SvelteKit auto-splits per route — each `+page.svelte` becomes a chunk, route-level imports tree-shake naturally. The audit is confirming nothing is accidentally pulled into the shared chunk.

## The command

Create `docs/PERFORMANCE.md` with the Lighthouse targets, performance budget, measurement protocol, and a baseline table.

Run `pnpm build` and inspect the Rollup report — any route > 300 KB gzipped needs investigation. At Phase 7 none breach.

```bash
pnpm build
```

## Why we chose this — the PE7 judgment

**Alt 1: Manual `import('./heavy-module')` everywhere.** Adds complexity for no gain — SvelteKit already splits.
**Alt 2: `prefetchOnHover` globally.** Overfetches on link-rich pages; SvelteKit's default `data-sveltekit-preload-data="hover"` is the right balance.

## Verify

Run `pnpm build`. The Rollup output shows chunk sizes per route. Nothing > 300 KB gzipped = pass.

## Mistake log

- Hoisted a large utility into `src/lib/index.ts` — pulled into every chunk. Moved back to `src/lib/server/` which Vite keeps server-only.

## Commit

```bash
git add docs/PERFORMANCE.md curriculum/module-07-polish/lesson-114-code-splitting.md
git commit -m "docs(perf): code-split audit + baseline + lesson 114"
```
