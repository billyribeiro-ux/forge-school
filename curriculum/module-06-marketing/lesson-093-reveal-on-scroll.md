---
number: 93
slug: reveal-on-scroll
title: Build RevealOnScroll + apply to the landing module grid
module: 6
moduleSlug: marketing
moduleTitle: Marketing
phase: 6
step: 2
previous: 92
next: null
estimatedMinutes: 15
filesTouched:
  - src/lib/components/marketing/RevealOnScroll.svelte
  - src/routes/+page.svelte
---

## Context

The marketing hero benefits from a subtle reveal as the user scrolls down. We wrap children in a component that watches the viewport with `IntersectionObserver` and applies an opacity + translate-Y transition once the element crosses the fold.

Zero Motion dependency — CSS transitions + `IntersectionObserver` is enough for a staggered reveal. Respects `prefers-reduced-motion` by skipping the animation entirely.

## The command

`src/lib/components/marketing/RevealOnScroll.svelte`:

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';
  type Props = { delayMs?: number; children: Snippet };
  let { delayMs = 0, children }: Props = $props();

  let node: HTMLDivElement | undefined = $state();
  let visible = $state(false);

  $effect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { visible = true; return; }
    if (node === undefined) return;
    const target = node;
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { visible = true; obs.disconnect(); }
    }, { rootMargin: '-8% 0px' });
    obs.observe(target);
    return () => obs.disconnect();
  });
</script>
<div bind:this={node} class="reveal" class:visible style:transition-delay="{delayMs}ms">
  {@render children()}
</div>
```

`src/routes/+page.svelte` — wrap the module-grid heading + each `module-card` in `<RevealOnScroll delayMs={i * 60}>` for a staggered entrance.

```bash
pnpm check
```

## Why we chose this — the PE7 judgment

**Alt 1: `framer-motion` `animate()` on mount.** Heavyweight for a 300-byte CSS transition. Motion shines for gesture-based + spring physics — not for fade-up.
**Alt 2: AOS (Animate On Scroll) library.** Jquery-era, pulls in global CSS, no tree-shaking.
**Alt 3: Pure CSS `@keyframes` with `animation-delay`.** Fires on mount regardless of viewport — reveals everything instantly on long pages.

The PE7 choice — **IntersectionObserver + CSS class toggle + `{#snippet}` child** — wins on weight, composability, and reduced-motion correctness.

## What could go wrong

**Symptom:** Reveal fires twice when element scrolls back into view
**Cause:** Observer not disconnected after first hit.
**Fix:** `obs.disconnect()` inside the intersecting branch — the observer is a one-shot.

**Symptom:** Hydration mismatch warning
**Cause:** SSR renders `class="reveal"` (invisible), client hydrates, observer fires → adds `visible`.
**Fix:** Initial server render matches initial client render (both invisible); only after mount does the client toggle. No mismatch.

## Verify

```bash
pnpm check && pnpm build
pnpm dev  # scroll down landing, module cards stagger in
# Toggle prefers-reduced-motion in DevTools → instant render
```

## Mistake log

- Used `children: () => unknown`. Svelte 5 exports a typed `Snippet` — the proper Snippet type keeps the `{@render children()}` call type-safe.
- Put the observer setup in `onMount`. `$effect` plays nicer with the Svelte 5 lifecycle and auto-cleans up.

## Commit

```bash
git add src/lib/components/marketing/RevealOnScroll.svelte src/routes/+page.svelte
git add curriculum/module-06-marketing/lesson-093-reveal-on-scroll.md
git commit -m "feat(marketing): RevealOnScroll + staggered module grid + lesson 093"
```
