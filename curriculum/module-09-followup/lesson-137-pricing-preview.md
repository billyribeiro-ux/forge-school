---
number: 137
commit: db7df114ac8ec833bd9cab9ac509458eb5a6e884
slug: pricing-preview
title: Add a PricingPreview teaser to the landing
module: 9
moduleSlug: followup
moduleTitle: v1.0 Follow-up
phase: 9
step: 2
previous: 136
next: null
estimatedMinutes: 10
filesTouched:
  - src/lib/components/marketing/PricingPreview.svelte
  - src/routes/+page.svelte
---

## Context

PROMPT.md Module 6 step 97 calls for a "pricing preview" on the landing. The full live pricing lives at `/pricing` (DB-backed). The landing is prerendered, so the preview ships static plan summaries with anchor prices ("from $X") and one-click links into `/pricing#<plan-slug>` for detail. Marketing-grade copy, zero load() dependency, zero `$env` reads.

## The command

`src/lib/components/marketing/PricingPreview.svelte` — three plan cards in a responsive grid; the middle plan ("Best value" / Pro Yearly) gets a `highlight` border. Each card lists 3-4 features and a "See details →" link.

```svelte
type Plan = { slug: string; eyebrow: string; name: string; anchor: string; lede: string; features: readonly string[]; highlight?: boolean };
const plans: readonly Plan[] = [
  { slug: 'forgeschool-pro-monthly', eyebrow: 'Pay as you go', name: 'Pro Monthly', anchor: 'from $49 / month', … },
  { slug: 'forgeschool-pro-yearly',  eyebrow: 'Best value',    name: 'Pro Yearly',  anchor: 'from $497 / year', highlight: true, … },
  { slug: 'forgeschool-lifetime',    eyebrow: 'One time',      name: 'Lifetime',    anchor: 'from $497', … }
];
```

`src/routes/+page.svelte` — render `<PricingPreview />` between the modules-preview and FAQ sections.

```bash
pnpm check
```

## Why we chose this — the PE7 judgment

**Alt 1: Load live prices into the landing.** Drops the prerender. Marketing pages should stay static + cacheable; "from $49" is good enough for a teaser.
**Alt 2: Skip the preview, link only to /pricing.** Visitors who don't click the link never see the pricing. Surfacing prices on the landing is a documented conversion lift.
**Alt 3: Centralize plan copy in a shared types file.** Real centralization is the seed (`scripts/seed-dev.ts`) — that IS the single source of truth for the live amounts. The marketing copy lives where the marketing component lives; flagged in the doc-comment.

## What could go wrong

**Symptom:** TypeScript error: `Property 'highlight' does not exist on type ...`
**Cause:** Inferred `as const` array union narrows out the optional field on plans that don't set it.
**Fix:** Declare an explicit `Plan` type with `highlight?: boolean`; type the array as `readonly Plan[]`.

**Symptom:** Anchor price drifts from the seed.
**Cause:** Hand-typed copy.
**Fix:** When the seed changes, update both this file and `/pricing` copy. Long-term, a `pnpm check:pricing` script could grep these in lock-step (deferred).

## Verify

`pnpm check && pnpm build`. Visit `/`, scroll to the new section, click each "See details →" — `/pricing#<slug>` opens.

## Mistake log

- Used `as const` on the plan array — `highlight: true` was inferred as a literal that didn't match the missing-key plans. Switched to explicit `Plan` type.
- First grid had `minmax(20rem, 1fr)` — three plans wrapped to one column past lg. Tightened to `16rem`.

## Commit

```bash
git add src/lib/components/marketing/PricingPreview.svelte src/routes/+page.svelte
git add curriculum/module-09-followup/lesson-137-pricing-preview.md
git commit -m "feat(marketing): PricingPreview landing teaser + lesson 137"
```
