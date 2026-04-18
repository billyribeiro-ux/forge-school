---
number: 37
slug: landing-page
title: Build the course landing page
module: 3
moduleSlug: content-pipeline
moduleTitle: Content Pipeline
phase: 3
step: 9
previous: 36
next: null
estimatedMinutes: 20
filesTouched:
  - src/routes/+page.md
  - src/routes/+page.ts
  - src/routes/+page.svelte
---

## Context

The root URL currently renders the iconography smoke test from lesson 012 — three icons and the word "Welcome." Useful as a pipeline check, not useful as a first impression. This lesson replaces it with a proper landing page: a hero describing ForgeSchool, live stats from the loader (lesson count, module count, estimated hours), an eight-module preview grid, and a "Why PE7?" callout. The primary CTA links straight to lesson 001 so a first-time visitor can start reading with one click.

We swap from `.md` (mdsvex) to `.svelte` (pure Svelte 5 component) because the landing page has data flow — the numbers come from the loader — and reactive CTAs. Mdsvex is for lesson prose; Svelte components are for chrome.

## The command

Delete the smoke-test landing:

```bash
rm src/routes/+page.md
```

Create `src/routes/+page.ts`:

```ts
import { listLessons, listModules } from '$lib/curriculum';

export const load = () => {
  const modules = listModules();
  const totalLessons = listLessons().length;
  const totalMinutes = modules.reduce(
    (sum, m) => sum + m.lessons.reduce((s, l) => s + l.estimatedMinutes, 0),
    0
  );
  return { modules, totalLessons, totalMinutes };
};

export const prerender = true;
```

Create `src/routes/+page.svelte`. Structure: `<main class="landing">` with three `<section>` blocks — `.hero`, `.modules-preview`, `.pe7-callout`. The hero imports the `ForgeMark` icon at 3rem size, renders the H1 with a brand-colored accent span, the lede paragraph, a CTA row (primary = start lesson 001, secondary = browse curriculum), and a `<dl class="stats">` showing lesson / module / hour counts derived from `data`.

The modules preview is an `<ol class="module-grid">` with one `<li class="module-card">` per module. A final `.module-placeholder` card calls out Modules 4-8 as "coming as the course builds out" — honest about current state.

The "Why PE7?" callout is a single paragraph explaining the "Why we chose this" discipline that distinguishes this course.

All styles wrapped in `@layer components`; the primary CTA button gets `background-color: var(--color-brand)`; card hover flips the border to `var(--color-brand)`.

Verify:

```bash
pnpm check
pnpm build
pnpm dev  # visit /
```

Expected: landing renders with ForgeMark icon, hero, stats (matching the current lesson count), three populated module cards + 1 placeholder, PE7 callout. Primary CTA links to `/lessons/spec-the-product`.

## Why we chose this — the PE7 judgment

**Alternative 1: Keep `.md` for the landing with mdsvex**
Simple. Also limits interactivity — no easy way to render live counts from the loader, no reactive CTAs. The home page is chrome, not content; Svelte is the right format.

**Alternative 2: Defer the landing to Module 6 (Marketing)**
Module 6 builds the full marketing site — navbar, footer, detailed pricing, FAQ, legal. The landing page is a subset of that. We ship a simple version now so the root URL is meaningful; Module 6 replaces it with the full production landing.

**Alternative 3: Fully static landing — no data from the loader**
Hardcode "170 lessons across 8 modules." Easy until the count changes; the hardcoded value drifts from reality. Reading from the loader means the numbers always match the shipping state. Zero maintenance.

**Alternative 4: A/B test two hero variants**
Premature. A/B testing requires an analytics pipeline (lesson 113) and enough traffic to power conclusions. For pre-launch, a single deliberate hero is the right choice.

The PE7 choice — `.svelte` landing with loader-driven stats, ForgeMark icon, single-page composition — wins because it's honest about current state, deterministically synced with the curriculum, and a solid substrate Module 6 can iterate on.

## What could go wrong

**Symptom:** "Total hours" shows 0
**Cause:** Division rounding. `totalMinutes / 60` rounds to integer; if total minutes are under 30, it rounds to 0.
**Fix:** Use `Math.round(totalMinutes / 60)` (already done) — this produces 1 at 30+ minutes. For sub-1-hour totals, it's fine to show 0 or swap to "30 minutes" when minutes are under 60.

**Symptom:** `firstLesson` is undefined on an empty curriculum
**Cause:** No lessons exist (edge case, e.g., during bootstrap).
**Fix:** Optional chaining: `data.modules[0]?.lessons[0]`. If undefined, wrap the primary CTA in `{#if firstLesson !== undefined}`. Empty curriculum renders the secondary CTA only.

**Symptom:** Module cards stack in a single column on wide screens
**Cause:** Grid `grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr))` gives at least 16rem per card. If the parent is narrow, only one column fits.
**Fix:** Check the `.section-inner`'s `max-inline-size` is wider than 16rem (it is — 72rem). If stacking persists, a parent container is constraining width.

**Symptom:** Primary CTA uses the wrong color in dark mode
**Cause:** `--color-brand-fg` isn't set in dark mode, falling back to its light-mode value.
**Fix:** `tokens.css`'s dark-mode block defines `--color-brand-fg: var(--color-neutral-950)` — a near-black for contrast against the lighter-in-dark-mode brand. Confirm the dark-mode overrides are present.

## Verify

```bash
pnpm check
pnpm build
```
Expected: 0 errors.

Open `pnpm dev`, visit `/`. Confirm:
- ForgeMark icon renders at 3rem in brand color
- Hero H1 wraps with the "real fullstack platform" span in brand accent
- Stats show current lesson count, module count, hours (all > 0)
- Primary CTA reads "Start Lesson 001 — Spec the product..."
- Module cards lift on hover (border → brand color)

## Mistake log — things that went wrong the first time I did this

- **Kept `src/routes/+page.md` as a fallback "in case the Svelte version breaks".** SvelteKit doesn't like two `+page` files for the same route — compile error. Removed the `.md`; the `.svelte` is the only one.
- **Hardcoded "170 lessons" in the lede.** Built to 35 lessons; the lede lied. Replaced with `{data.totalLessons}`. One source of truth.
- **Used `data.modules.length` everywhere the UI needed "8".** Currently we ship Modules 1-3 (3 modules). Counting what exists is honest; the placeholder card calls out the rest.
- **Put the hero's `ForgeMark` inside the H1.** Odd outline structure; assistive tech announced a heading-with-icon. Moved the icon before the eyebrow/h1 group so it's decorative, not part of the heading text.

## Commit this change

```bash
git rm src/routes/+page.md
git add src/routes/+page.ts src/routes/+page.svelte
git add curriculum/module-03-content-pipeline/lesson-037-landing-page.md
git commit -m "feat(content): replace smoke test with real landing page + lesson 037"
```

The root URL is now a proper entry point. Lesson 038 adds the Motion-driven reading progress indicator — the last pixel of Module 3.
