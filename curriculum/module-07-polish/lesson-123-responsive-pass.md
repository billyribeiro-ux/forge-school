---
number: 123
commit: 4ab5e54b4a8b87a93c0a56fe8202a3a657700713
slug: responsive-pass
title: 9-breakpoint responsive pass
module: 7
moduleSlug: polish
moduleTitle: Polish
phase: 7
step: 13
previous: 122
next: null
estimatedMinutes: 20
filesTouched:
  - docs/ACCESSIBILITY.md
---

## Context

Every public page renders correctly across the 9-tier breakpoint scale: xs (320), sm (480), md (768), lg (1024), xl (1280), xl2 (1536), xl3 (1920), xl4 (2560), xl5 (3840).

## The checklist per breakpoint

- No horizontal scroll (ever).
- Type stays readable (body ≥ 14px clamp floor).
- Interactive targets ≥ 44px square on touch breakpoints (xs + sm).
- Multi-column grids collapse cleanly.
- SiteNav's links hide below 640px; a hamburger lands when a later lesson demands it.

## The command

DevTools device emulation at each breakpoint. Spot-check landing, pricing, cart, account, course.

No global code changes at this pass — existing `grid-template-columns: repeat(auto-fill, minmax(Xrem, 1fr))` patterns already collapse correctly.

## Why we chose this — the PE7 judgment

**Alt 1: Test only at 320, 768, 1024, 1440.** Misses xl2+ wide screens and 4K browsing.
**Alt 2: Fluid-everything (`clamp` all the things).** Fluid typography is already on (`clamp()` for headings); fluid layout gets diminishing returns past three breakpoints.

## Verify

DevTools → Responsive mode → width slider from 320 to 3840 → no horizontal scroll, no broken layouts.

## Mistake log

- `.cart-page` row grid was `1fr auto auto auto` — at xs, the line-total column overflowed. Added `min-inline-size: 0` on the name cell.
- Footer's `grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr))` wrapped to one column below xs — acceptable.

## Commit

```bash
git add curriculum/module-07-polish/lesson-123-responsive-pass.md
git commit -m "docs(responsive): 9-breakpoint pass + lesson 123"
```
