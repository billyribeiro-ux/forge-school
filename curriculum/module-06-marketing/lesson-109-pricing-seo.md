---
number: 109
slug: pricing-seo
title: Adopt SeoMeta on /pricing
module: 6
moduleSlug: marketing
moduleTitle: Marketing
phase: 6
step: 18
previous: 108
next: null
estimatedMinutes: 5
filesTouched:
  - src/routes/pricing/+page.svelte
---

## Context

Dogfood the `SeoMeta` helper on the highest-intent marketing page. Swaps the inline `<svelte:head>` for `<SeoMeta title description path />`.

## The command

Replace:
```svelte
<svelte:head>
  <title>Pricing — ForgeSchool</title>
  <meta name="description" content="…" />
</svelte:head>
```

with:
```svelte
<SeoMeta title="Pricing" description="…" path="/pricing" />
```

```bash
pnpm check && pnpm build
```

## Why we chose this — the PE7 judgment

**Alt 1: Roll out to all pages in one lesson.** Noisy diff; harder to review. Landing + pricing are the two highest-value pages; others can adopt in a later polish commit.
**Alt 2: Skip adoption — leave the inline head tags.** Drift.

## Verify

`curl -s http://localhost:5173/pricing | grep 'og:title'` — expect the OG tag.

## Mistake log

- Forgot to delete the old `<svelte:head>` block — SvelteKit rendered both, duplicating the title tag.

## Commit

```bash
git add src/routes/pricing/+page.svelte curriculum/module-06-marketing/lesson-109-pricing-seo.md
git commit -m "feat(marketing): SeoMeta on /pricing + lesson 109"
```
