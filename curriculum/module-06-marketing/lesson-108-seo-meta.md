---
number: 108
slug: seo-meta
title: Add SeoMeta (OG + Twitter + JSON-LD) to landing
module: 6
moduleSlug: marketing
moduleTitle: Marketing
phase: 6
step: 17
previous: 107
next: null
estimatedMinutes: 15
filesTouched:
  - src/lib/components/marketing/SeoMeta.svelte
  - src/routes/+page.svelte
---

## Context

Per-page `<SeoMeta>` component — one place to emit title, description, OpenGraph + Twitter cards, canonical link, and optional JSON-LD. Each public page passes its own `title` + `description` + `path`.

JSON-LD is optional — pass a `jsonLd` object to emit a `<script type="application/ld+json">` block. Landing page uses `@type: Course`.

## The command

`src/lib/components/marketing/SeoMeta.svelte` — takes the props, renders into `<svelte:head>`. Uses `{@html}` for the JSON-LD script because Svelte can't nest `<script>` inside `<script>` blocks without string concat.

`src/routes/+page.svelte` — replace the inline `<svelte:head>` with `<SeoMeta ... />`.

Other pages adopt the component in the next polish pass (not in the per-lesson commit — too much surface for one lesson).

```bash
pnpm check
```

## Why we chose this — the PE7 judgment

**Alt 1: Inline meta tags per page.** Inevitably drifts — one page forgets the `twitter:card` tag.
**Alt 2: Generate meta from the route's `title`/`description` in load().** Forces every page to opt in to returning those fields; more friction than a component.
**Alt 3: `svelte-seo` library.** Adds a dependency for 40 lines of code.

## Verify

`pnpm check && pnpm build`. Visit `/`, inspect `<head>` — canonical, og:*, twitter:*, application/ld+json all present.

## Mistake log

- Tried to render JSON-LD with `<script>{...}</script>` in the template — Svelte compiled it as a module script. `{@html}` with a literal-string workaround is the idiom.
- Hard-coded the `og:url` to `/` — broke on deep pages. Accepts `path` prop now.

## Commit

```bash
git add src/lib/components/marketing/SeoMeta.svelte src/routes/+page.svelte
git add curriculum/module-06-marketing/lesson-108-seo-meta.md
git commit -m "feat(marketing): SeoMeta (OG/Twitter/JSON-LD) component + lesson 108"
```
