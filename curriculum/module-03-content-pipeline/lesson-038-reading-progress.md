---
number: 38
commit: f416fb7e08bc73045e8d537d47e4e5128931343f
slug: reading-progress
title: Install Motion and add the reading-progress indicator
module: 3
moduleSlug: content-pipeline
moduleTitle: Content Pipeline
phase: 3
step: 10
previous: 37
next: 39
estimatedMinutes: 15
filesTouched:
  - package.json
  - pnpm-lock.yaml
  - src/lib/components/course/ReadingProgress.svelte
  - src/routes/lessons/[slug]/+page.svelte
---

## Context

A long lesson (some push 300 lines) is hard to navigate without a sense of "how far have I read?" The reading-progress bar at the top of the viewport — a thin brand-colored line that fills from 0 to 100% as the reader scrolls — answers that question at a glance. It's a staple of modern docs sites (Stripe, Vercel, Linear) because it works.

We install **Motion** (motion.dev) now as our animation library per the stack spec. This lesson's specific use of Motion is light — a scroll-linked transform — but installing it here gives Module 6's marketing animations and Module 5's UI affordances a pre-wired dependency.

The component respects `prefers-reduced-motion`: users who've opted out of animation get no scroll listener and no transform, just the default hidden bar.

## The command

Install Motion:

```bash
pnpm add motion
```

Create `src/lib/components/course/ReadingProgress.svelte`. It renders a fixed-position bar, attaches a requestAnimationFrame-throttled scroll listener in `onMount`, and updates the bar's `transform: scaleX(...)` with the current scroll progress:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  let barEl: HTMLDivElement | undefined = $state();

  onMount(() => {
    if (barEl === undefined) return;
    if (typeof window === 'undefined') return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let rafId: number | null = null;
    const update = () => {
      rafId = null;
      if (barEl === undefined) return;
      const doc = document.documentElement;
      const maxScroll = doc.scrollHeight - doc.clientHeight;
      const progress = maxScroll <= 0 ? 0 : Math.min(1, Math.max(0, window.scrollY / maxScroll));
      barEl.style.transform = `scaleX(${progress})`;
    };
    const onScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(update);
    };

    let cleanup: (() => void) | undefined;
    import('motion').then(() => {
      update();
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      cleanup = () => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
        if (rafId !== null) cancelAnimationFrame(rafId);
      };
    });

    return () => { cleanup?.(); };
  });
</script>

<div class="reading-progress" aria-hidden="true">
  <div class="bar" bind:this={barEl}></div>
</div>

<style>
  @layer components {
    .reading-progress { position: fixed; inset-block-start: 0; inset-inline: 0; block-size: 3px; z-index: 100; pointer-events: none; }
    .bar { block-size: 100%; inline-size: 100%; background-color: var(--color-brand); transform: scaleX(0); transform-origin: left; will-change: transform; transition: transform var(--duration-instant) linear; }
    @media (prefers-reduced-motion: reduce) { .bar { transition: none; } }
  }
</style>
```

Three details:

- **`aria-hidden="true"`** — the bar is decoration; screen readers shouldn't announce it.
- **`requestAnimationFrame` throttling** — scroll events fire at 60-120hz on modern displays; without throttling, every event would trigger a layout read. `rafId` ensures at most one update per frame.
- **`import('motion').then(...)`** — lazy-loads Motion only in the browser, keeping the initial bundle slim. For this specific component the Motion import isn't used directly — we're using a plain scroll listener — but the lazy import establishes the pattern future components (Module 6's hero animations) will follow.

Wire it into the lesson page. `src/routes/lessons/[slug]/+page.svelte`:

```diff
 <script lang="ts">
   import ModuleSidebar from '$lib/components/course/ModuleSidebar.svelte';
+  import ReadingProgress from '$lib/components/course/ReadingProgress.svelte';
   import type { PageProps } from './$types';
   let { data }: PageProps = $props();
 </script>

+<ReadingProgress />
+
 <svelte:head>...
```

The component renders a fixed-position bar, so it can live anywhere in the markup — placing it before `<svelte:head>` keeps it out of the semantic flow.

Verify:

```bash
pnpm check
pnpm build
pnpm dev  # visit /lessons/<any>
```

Scroll through a lesson. The brand-colored bar at the top of the viewport advances as you scroll. Toggle your OS "Reduce motion" preference — bar stays invisible, no scroll listener attached.

## Why we chose this — the PE7 judgment

**Alternative 1: Pure CSS with `scroll-timeline`**
Modern Chrome + Safari support `animation-timeline: scroll()`, which gives scroll-linked animation with zero JS. The problem in 2026: Firefox doesn't support it yet (implementation in progress). A CSS-only progress bar would be invisible in Firefox. The JS fallback works everywhere.

**Alternative 2: Intersection Observer per H2 heading**
Track which heading is nearest the viewport top and show a "section N of M" readout. More detailed, more implementation. The simple percentage is good enough for this lesson; a section tracker is a future enhancement.

**Alternative 3: Scroll listener without rAF throttling**
Works. Also drops frames on long lessons because every scroll event forces a layout read. rAF ensures we batch reads with the browser's repaint cycle.

**Alternative 4: Skip the bar entirely**
Some docs sites omit it. For dense technical content where "where am I" is a real question, the bar is a cheap-to-implement UX win.

**Alternative 5: Attach the listener in `$effect` instead of `onMount`**
Svelte 5 supports `$effect` for side effects. It works here. `onMount` is more explicit about the "this only runs once in the browser" intent; it also runs only on the client, matching the `window` guards.

The PE7 choice — fixed-position Motion-lazy-loaded bar with rAF throttling and prefers-reduced-motion respect — wins because it runs across browsers, doesn't block hydration, honors accessibility, and introduces Motion as an installed dep without taxing this lesson's surface.

## What could go wrong

**Symptom:** Bar fills to 100% immediately on short lessons
**Cause:** `scrollHeight - clientHeight <= 0` on a page that fits within the viewport. The progress divisor is zero.
**Fix:** The `maxScroll <= 0 ? 0 : ...` guard sets progress to 0 in that case. The bar stays hidden on short lessons.

**Symptom:** Bar persists between client-side navigations
**Cause:** The component unmounted but the scroll listener didn't clean up — or the component re-mounted without resetting the bar.
**Fix:** The `cleanup` closure in `onMount` runs on unmount; verify it's called. The component is re-created per route, so the bar state resets naturally.

**Symptom:** Reduce-motion users still see the bar fill
**Cause:** The `prefers-reduced-motion` check was missed, or fired before `matchMedia` had loaded.
**Fix:** The check is synchronous; `matchMedia('(prefers-reduced-motion: reduce)').matches` returns immediately. If the bar still animates, inspect whether `onMount` ran — open DevTools, toggle the OS pref, reload.

**Symptom:** Flash of fully-filled bar on page load, then snaps to 0
**Cause:** The bar's default `transform: scaleX(0)` wasn't computed before paint. Unusual, but can happen if the stylesheet loads async.
**Fix:** Styles are imported synchronously via `layer.css` in `+layout.svelte`. If the flash persists, confirm the `@layer components` block is being emitted (check DevTools Elements panel for the scoped class).

## Verify

```bash
pnpm check
pnpm build
```
Expected: 0 errors; `motion` appears in `dependencies`.

```bash
pnpm dev  # visit a long lesson (e.g., /lessons/write-drizzle-schema)
```
Expected: brand-colored 3px bar at the top of viewport grows left-to-right as you scroll; reaches full width at the bottom.

Test reduced-motion: open macOS System Settings → Accessibility → Display → "Reduce motion" (or equivalent). Reload the lesson. Bar stays at 0 regardless of scroll.

## Mistake log — things that went wrong the first time I did this

- **Attached a scroll listener without rAF.** Dropped frames on long lessons; `scrollY` reads caused layout thrashing. Wrapped in `requestAnimationFrame` — smooth on every browser.
- **Used Motion's `scroll()` helper for the transform.** It worked, but pulled in Motion's full animation runtime synchronously. For a pure scroll-to-scale-X mapping, a bare scroll listener is strictly lighter. Motion still gets installed (future lessons need it); this specific component doesn't need to run through it.
- **Forgot `will-change: transform`.** First implementation repainted the bar's rectangle area on every scroll event. `will-change: transform` hints the browser to composite the bar on its own layer; paint cost drops to near zero.
- **Put the component inside `<article class="lesson-page">`.** The `position: fixed` should free it from the flex/grid context, but in some layouts the ancestor's `transform` or `filter` creates a containing block that traps `fixed`. Moved to the top of the template — before `<svelte:head>` — so no ancestor can contain it.

## Commit this change

```bash
git add package.json pnpm-lock.yaml \
       src/lib/components/course/ReadingProgress.svelte \
       src/routes/lessons/\[slug\]/+page.svelte
git add curriculum/module-03-content-pipeline/lesson-038-reading-progress.md
git commit -m "feat(content): install Motion + reading progress bar + lesson 038"
```

With the progress indicator shipped, Module 3's content pipeline is functionally complete. Lesson 039 validates every gate and tags `phase-3-complete`.
