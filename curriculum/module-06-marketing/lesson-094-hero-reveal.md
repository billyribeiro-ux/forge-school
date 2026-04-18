---
number: 94
slug: hero-reveal
title: Stagger the hero's reveal on landing
module: 6
moduleSlug: marketing
moduleTitle: Marketing
phase: 6
step: 3
previous: 93
next: null
estimatedMinutes: 10
filesTouched:
  - src/routes/+page.svelte
---

## Context

The RevealOnScroll wrapper built in lesson 093 lets us sequence the hero elements (mark → eyebrow → h1 → lede → CTA row → stats) at 80–100ms offsets. The result: a single cinematic reveal at first paint, no jank, no JS libraries beyond Svelte + `IntersectionObserver`.

## The command

Wrap each hero element in `<RevealOnScroll delayMs={N}>` with cascading delays. 80ms between elements is enough for the eye to register the staircase without feeling slow.

```svelte
<RevealOnScroll><ForgeMark /></RevealOnScroll>
<RevealOnScroll delayMs={80}><p class="eyebrow">ForgeSchool</p></RevealOnScroll>
<RevealOnScroll delayMs={140}><h1>…</h1></RevealOnScroll>
<RevealOnScroll delayMs={220}><p class="lede">…</p></RevealOnScroll>
<RevealOnScroll delayMs={300}><div class="cta-row">…</div></RevealOnScroll>
<RevealOnScroll delayMs={380}><dl class="stats">…</dl></RevealOnScroll>
```

```bash
pnpm check && pnpm build
```

## Why we chose this — the PE7 judgment

**Alt 1: Animate everything simultaneously.** No rhythm — the eye can't follow the hierarchy.
**Alt 2: Wait for each element to scroll into view.** Hero is above the fold; no one scrolls.
**Alt 3: Lock delays to frame multiples (16.67ms).** Over-engineered — human perception doesn't operate at frame granularity for fades.

## What could go wrong

**Symptom:** Reveal skipped entirely above the fold
**Cause:** `IntersectionObserver` with `rootMargin: '-8% 0px'` considers elements within 8% of the viewport already visible. On first paint, hero elements are 100% visible → observer fires immediately → visible=true.
**Fix:** Expected behaviour for a hero.

## Verify

Load `/`, watch the stair-step. Toggle reduced-motion, confirm instant render.

## Mistake log

- Gave every element 100ms delay — linear timing feels robotic. Varied 80/60/80/80/80 for a more human staircase.

## Commit

```bash
git add src/routes/+page.svelte
git add curriculum/module-06-marketing/lesson-094-hero-reveal.md
git commit -m "feat(marketing): stagger hero reveals + lesson 094"
```
