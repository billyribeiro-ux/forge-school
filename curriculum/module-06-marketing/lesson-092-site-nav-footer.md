---
number: 92
slug: site-nav-footer
title: Ship site-wide nav + footer
module: 6
moduleSlug: marketing
moduleTitle: Marketing
phase: 6
step: 1
previous: 91
next: null
estimatedMinutes: 20
filesTouched:
  - src/lib/components/marketing/SiteNav.svelte
  - src/lib/components/marketing/SiteFooter.svelte
  - src/routes/+layout.svelte
---

## Context

Module 6 opens with the public chrome: a sticky, scroll-aware navigation bar and a three-column footer. Both render on every non-admin page. The admin shell (lesson 086) gets its own layout, so we suppress the chrome there via a path check.

## The command

`src/lib/components/marketing/SiteNav.svelte` — sticky nav, brand on left, link list, CTAs (Cart + Get access). Tracks `scrolled` via a `scroll` listener; adds a 1px shadow + solid background past 8px.

`src/lib/components/marketing/SiteFooter.svelte` — three columns (Nav / Legal / Meta) + copyright strip.

`src/routes/+layout.svelte` — import both, conditionally render them:

```svelte
<script lang="ts">
  import { page } from '$app/state';
  const chromeVisible = $derived(!page.url.pathname.startsWith('/admin'));
</script>
{#if chromeVisible}<SiteNav />{/if}
{@render children()}
{#if chromeVisible}<SiteFooter />{/if}
```

```bash
pnpm check
pnpm build
```

## Why we chose this — the PE7 judgment

**Alt 1: `(marketing)` route group layout.** Moving `/` into a group disrupts prerender paths. Mounting chrome in the root layout with a path-gate is simpler.

**Alt 2: Full framer-motion scroll animations.** Will layer in lesson 094 for the hero. The nav's `scroll > 8px` toggle is cheap and non-blocking; a framer-motion scroll-linked effect is overkill here.

**Alt 3: `nav` without `aria-label`.** Screen readers hear a generic "navigation." `aria-label="Primary"` disambiguates.

## What could go wrong

**Symptom:** Nav flashes twice on first paint
**Cause:** `scrolled` state hydrates false-then-true in the same frame.
**Fix:** `onMount` reads `window.scrollY` once; initial class is `scrolled=false` which matches the top-of-page reality.

**Symptom:** Admin page shows duplicate top bar
**Cause:** `page.url.pathname` check missed — e.g., used `window.location` (undefined in SSR).
**Fix:** Always use `page.url` from `$app/state`.

## Verify

```bash
pnpm check && pnpm build
pnpm dev  # scroll / — nav shadow appears; visit /admin — no site nav
```

## Mistake log

- Imported `page` from `$app/stores` — deprecated in Svelte 5. Swapped for `$app/state`.
- Forgot `backdrop-filter` + `-webkit-backdrop-filter`. Safari ignores without the vendor prefix.
- Used `color-mix(in srgb, ...)` for the translucent background; OKLCH mixing preserves hue as documented in the PE7 styling conventions.

## Commit

```bash
git add src/lib/components/marketing/ src/routes/+layout.svelte
git add curriculum/module-06-marketing/lesson-092-site-nav-footer.md
git commit -m "feat(marketing): site nav + footer + lesson 092"
```
