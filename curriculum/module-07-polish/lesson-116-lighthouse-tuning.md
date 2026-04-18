---
number: 116
commit: f57dbd394dcc7c6daef2d32a903199bc1b1f3667
slug: lighthouse-tuning
title: Tune to Lighthouse 95+ on every public page
module: 7
moduleSlug: polish
moduleTitle: Polish
phase: 7
step: 6
previous: 115
next: null
estimatedMinutes: 20
filesTouched:
  - src/app.html
  - svelte.config.js
---

## Context

Baseline showed the landing at Performance 87; every other page was 92+. The 8-point gap on the landing traces to the unoptimized hero background render (CSS clamp + large font render). Four concrete fixes:

1. Preload the self-hosted brand font (when added in a later module) via `<link rel="preload" as="font" crossorigin>` in `src/app.html`.
2. Add `font-display: swap` via `@font-face` declarations — prevents FOIT blocking paint.
3. Inline critical above-the-fold CSS via SvelteKit's built-in inline strategy (`kit.inlineStyleThreshold` in `svelte.config.js`).
4. Mark the hero section's first paint priority.

## The command

`svelte.config.js` — set `inlineStyleThreshold: 4096` (inline CSS ≤ 4 KB):

```diff
 const config = {
   kit: {
     adapter: adapter(),
+    inlineStyleThreshold: 4096
   }
 };
```

`src/app.html` — ensure `<meta name="viewport">` is present (defensive; SvelteKit already includes it) and add `rel="dns-prefetch"` for Stripe on public pages to speed up subsequent checkout.

Add `fetchpriority="high"` to the first-paint images when they land (policy in lesson 113).

```bash
pnpm build  # + re-run Lighthouse
```

## Why we chose this — the PE7 judgment

**Alt 1: Preload everything.** Wastes bandwidth; the browser's own heuristics are good.
**Alt 2: CDN for static assets.** Phase 8's deploy target (Vercel / Netlify) handles this automatically.

## Verify

Re-run Lighthouse against `pnpm build && vite preview`. Target: ≥ 95 across all four scores on `/`, `/pricing`, and a lesson page.

## Mistake log

- Set `inlineStyleThreshold` to 16 KB — inlined so much CSS it ballooned the HTML payload. 4 KB is the sweet spot.
- Preloaded a font that wasn't actually rendered in the first viewport. Removed.

## Commit

```bash
git add svelte.config.js src/app.html curriculum/module-07-polish/lesson-116-lighthouse-tuning.md
git commit -m "perf(build): inline CSS threshold + preload hints + lesson 116"
```
