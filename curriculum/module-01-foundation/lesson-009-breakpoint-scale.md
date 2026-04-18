---
number: 9
slug: breakpoint-scale
title: Build the 9-tier breakpoint scale
module: 1
moduleSlug: foundation
moduleTitle: Foundation
phase: 1
step: 9
previous: 8
next: 10
estimatedMinutes: 10
filesTouched:
  - src/lib/styles/breakpoints.css
  - src/routes/+layout.svelte
---

## Context

A responsive design with three breakpoints looks fine on a laptop. It looks wrong everywhere else — cramped on an iPhone SE, wasteful on a 27" trading rig. ForgeSchool's audience skews toward power users with 1440p and 4K monitors, so the breakpoint scale we commit to has to serve both the 320px-wide pocket device and the 3840px-wide UHD display with the same design language.

Nine breakpoints is deliberate. Fewer, and corners of the viewport population are served by layouts that were tuned for a different size. More, and every component's media query block becomes a maintenance burden. Nine is the knee of the curve — each tier is close enough to its neighbors that visual density changes gradually, far enough apart that the work of tuning each is meaningful.

This lesson produces a single file — `src/lib/styles/breakpoints.css` — that does two things: documents the canonical pixel values for the whole scale, and exposes them as CSS custom properties so JavaScript (container-query fallbacks, `window.matchMedia` listeners, layout-direction logic) can read them at runtime. Every `@media` rule in every component in this repo will use one of these nine widths. No ad-hoc pixel values anywhere else.

## The command

Create `src/lib/styles/breakpoints.css`:

```css
@layer tokens {
  :root {
    --bp-xs: 320px;    /* compact phones, portrait (smallest iPhone SE) */
    --bp-sm: 480px;    /* phones, landscape / large phones, portrait */
    --bp-md: 768px;    /* tablets, portrait (iPad mini/Air) */
    --bp-lg: 1024px;   /* tablets, landscape / small laptops */
    --bp-xl: 1280px;   /* laptops, small desktops */
    --bp-xl2: 1536px;  /* standard desktops */
    --bp-xl3: 1920px;  /* 1080p+ desktops (FullHD baseline) */
    --bp-xl4: 2560px;  /* 1440p / QHD displays (common for trading rigs) */
    --bp-xl5: 3840px;  /* 4K / UHD displays */
  }
}
```

The file carries a header block documenting the naming convention and the usage pattern: every component writes `@media (min-width: 768px)` with the literal pixel value that matches a named tier, and the value 768 is understood to mean "md breakpoint." Components never invent intermediate values.

Wire it into the root layout so it loads once at app boot:

```diff
 <script lang="ts">
 	import favicon from '$lib/assets/favicon.svg';
 	import '$lib/styles/tokens.css';
+	import '$lib/styles/breakpoints.css';

 	let { children } = $props();
 </script>
```

Verify the import is live:

```bash
pnpm check
pnpm build
```

Expected: clean build, no warnings.

In runtime code, breakpoint values are now readable via:

```ts
const mdPx = getComputedStyle(document.documentElement).getPropertyValue('--bp-md').trim();
// "768px"
```

## Why we chose this — the PE7 judgment

**Alternative 1: A 5-breakpoint Bootstrap/Tailwind-style scale (sm, md, lg, xl, 2xl)**
Five breakpoints cover the phone / tablet / laptop / desktop / large-desktop continuum at a coarse resolution. Bootstrap ships with exactly five. The problem in 2026 is the upper end: the gap from "xl" at 1280px to "2xl" at 1536px is enormous for desktop layouts, and there's nothing above 1536px even though 1920px and 2560px displays are common on the kinds of machines that run trading platforms. A 5-tier scale forces you to invent ad-hoc `@media (min-width: 1920px)` queries in components, and ad-hoc rules violate the "single source of truth" principle we established for colors in lesson 008.

**Alternative 2: Only two tiers — mobile and desktop**
"Mobile-first" is a design philosophy, not a breakpoint count. A two-tier system forces every layout to choose between phone-sized and laptop-sized, which produces bad experiences on tablets and on oversized monitors. This was defensible in 2014 when phones and laptops dominated; it is indefensible in 2026 when tablets, foldables, and UHD monitors are mainstream.

**Alternative 3: Use container queries everywhere and no viewport breakpoints at all**
Container queries are excellent for component-level responsiveness — a card that fits in a sidebar should render one way, the same card that fills the main content column should render another. They are the wrong tool for page-level decisions — "show a nav drawer on small viewports" or "render 3 columns above 1280px." Page-level layout still needs viewport breakpoints. The PE7 answer uses both: container queries inside components, viewport breakpoints at layout boundaries.

**Alternative 4: Define breakpoints with `@custom-media` and resolve via a PostCSS plugin (or Lightning CSS drafts flag)**
This was the first PE7 attempt. `@custom-media --md (min-width: 768px);` in one file, then `@media (--md) { ... }` in every component. In theory, ideal — the breakpoint name is a first-class CSS identifier, and a refactor from 768 to 800 is a one-line edit.
In practice, there is no pure-CSS, cross-tool way to make this work as of 2026. `postcss-custom-media` v12 removed `importFrom`, which means each file must declare its own `@custom-media` (defeating the DRY goal). Lightning CSS supports `@custom-media` parsing via its drafts flag, but Vite 8's per-file CSS processing does not propagate declarations across module boundaries. The workaround — `@import './breakpoints.css';` at the top of every component — adds boilerplate without payoff.
The pragmatic PE7 answer is to skip the abstraction. Nine breakpoints, documented, hardcoded in components. When `@custom-media` stabilizes and Vite's CSS pipeline catches up (projected 2027-2028), migrate in one pass. Until then, `@media (min-width: 768px)` with a comment is honest and bulletproof.

**Alternative 5: Use `rem`-based breakpoints instead of pixel-based**
The argument: users who increase their font size in browser settings should see breakpoints shift with them. Counter-argument: breakpoints are about viewport space, not typography. A 768px tablet has 768 physical pixels regardless of font size, and that's the signal we're keying off — whether a two-column layout fits. `rem`-based breakpoints produce surprising jumps when a user bumps their font size; pixel-based breakpoints are predictable. The user-accessibility concern is real but is better addressed by fluid typography (lesson 010) and by making layouts flex gracefully between breakpoints.

The PE7 choice — 9 pixel-based tiers, documented in a single file, referenced by convention — wins because it covers the full device population, stays deterministic across tooling, and ages well.

## What could go wrong

**Symptom:** A component has a media query at `@media (min-width: 800px)` and it's producing inconsistent behavior with neighbors
**Cause:** 800 is not in the canonical scale. Someone invented an intermediate value.
**Fix:** Pick the nearest canonical tier (`768` or `1024`) and re-test. If neither works, the component's needs are probably size-based, not viewport-based — refactor to use a container query.

**Symptom:** A `matchMedia('(min-width: var(--bp-md))')` listener fails silently
**Cause:** `matchMedia` does not accept CSS custom properties as arguments. The `var(--bp-md)` is passed as-is to the parser, which rejects it.
**Fix:** Read the custom property first, then pass the literal value:
```ts
const mdPx = getComputedStyle(document.documentElement).getPropertyValue('--bp-md').trim();
const mql = window.matchMedia(`(min-width: ${mdPx})`);
```

**Symptom:** A layout looks broken at exactly 1280px width when dragging the browser window
**Cause:** A `@media (min-width: 1280px)` rule and a `@media (max-width: 1280px)` rule both match at exactly 1280px, producing a style conflict.
**Fix:** Use `(max-width: 1279.98px)` for the "below xl" query. The 0.02px gap matches the subpixel resolution browsers render at and avoids the exact-match overlap.

**Symptom:** Dev tools "responsive" mode skips over some of the breakpoints
**Cause:** Chrome/Firefox responsive mode presets don't include every tier of this scale.
**Fix:** Add custom presets in dev tools for the nine breakpoints: Chrome → three-dot menu → Edit → New device with exact widths 320, 480, 768, 1024, 1280, 1536, 1920, 2560, 3840.

## Verify

```bash
# Breakpoints file exists with the expected custom properties
grep -c "^\s*--bp-" src/lib/styles/breakpoints.css
```

Expected: `9` — one line per breakpoint tier.

```bash
# Every documented pixel value is present exactly once
grep -oE '[0-9]+px' src/lib/styles/breakpoints.css | sort -u
```

Expected: `320px 480px 768px 1024px 1280px 1536px 1920px 2560px 3840px` (plus whatever else the file documents).

```bash
# The root layout imports the file
grep 'breakpoints.css' src/routes/+layout.svelte
```

Expected: `import '$lib/styles/breakpoints.css';`

```bash
# Full check + build pass
pnpm check
pnpm build
```

Expected: 0 errors.

Open the running dev server, open DevTools, inspect `:root`. The nine `--bp-*` custom properties should be visible in the computed styles panel.

## Mistake log — things that went wrong the first time I did this

- **Tried `@custom-media --md (min-width: 768px)` + `@media (--md)` via `postcss-custom-media`.** Installed the plugin, wrote a `postcss.config.js`, authored `breakpoints.css` with nine `@custom-media` declarations. The build failed with `"importFrom" is no longer supported` — v12 of the plugin removed cross-file declaration sharing. Without `importFrom`, each component file would need to re-declare every breakpoint, which defeats the entire abstraction. Uninstalled `postcss` + `postcss-custom-media`.
- **Pivoted to Lightning CSS with `Features.CustomMediaQueries` enabled.** Configured `vite.config.ts` with `css.transformer: 'lightningcss'`. Build succeeded, but the compiled output still contained literal `@media (--md) { ... }` rules — Lightning CSS's per-file scoping does not cross module boundaries in Vite's CSS pipeline. Uninstalled Lightning CSS, reverted `vite.config.ts`.
- **Landed on pure-CSS convention.** Hardcoded pixel values in every component's `@media` rule, with the canonical values documented once in `breakpoints.css`. Zero build-tool complexity. The refactor-cost of changing a breakpoint (grep + replace across the codebase) is accepted because the nine breakpoints are a contract — they do not change often, and when they do, the change propagates through every layout intentionally.
- **Attempted to put the `@layer tokens` block *outside* the `:root` wrapper.** CSS custom properties defined outside `:root` apply to a single element scope, not the document. Moved back inside `:root { ... }`.
- **Named the tiers `xs, sm, md, lg, xl, 2xl, 3xl, 4xl, 5xl` following the Tailwind convention.** Hyphen tokens like `2xl` produce awkward JS identifiers (`bp2xl`, `bp-2xl`) and break `getPropertyValue('--bp-2xl')` only cosmetically, but the naming looked inconsistent in the token file — one character for some, two characters for others. Switched to `xs, sm, md, lg, xl, xl2, xl3, xl4, xl5` — the "xl" prefix stays constant above laptop, and the trailing digit is monotonic with display size.

## Commit this change

```bash
git add src/lib/styles/breakpoints.css src/routes/+layout.svelte
git add curriculum/module-01-foundation/lesson-009-breakpoint-scale.md
git commit -m "feat(breakpoints): add 9-tier breakpoint scale + lesson 009"
```

With the breakpoint scale committed, every layout in this codebase has nine canonical viewport widths to snap to. Lesson 010 builds the fluid typography scale — the last piece of the design-system chassis before we assemble the cascade architecture in lesson 011.
