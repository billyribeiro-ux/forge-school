---
number: 95
commit: 5f135e76b4359f853bff4060dd0d46feb8fac75d
slug: value-prop
title: Add a three-column value-prop section to the landing
module: 6
moduleSlug: marketing
moduleTitle: Marketing
phase: 6
step: 4
previous: 94
next: null
estimatedMinutes: 10
filesTouched:
  - src/lib/components/marketing/ValueProp.svelte
  - src/routes/+page.svelte
---

## Context

Between the hero and the modules preview, the landing needs a beat that answers "why ForgeSchool?". Three cards: commit-per-lesson, judgment-not-code, 10-year-longevity. Each uses `RevealOnScroll` with staggered delays.

## The command

`src/lib/components/marketing/ValueProp.svelte` — three-card grid. Each card has a monospace number (01, 02, 03), a heading, and a 2-sentence body.

`src/routes/+page.svelte` — import + render `<ValueProp />` between the hero and modules-preview sections.

```bash
pnpm check && pnpm build
```

## Why we chose this — the PE7 judgment

**Alt 1: Bullet list under the hero.** Lower visual weight; no breathing room.
**Alt 2: Fourth card for "affordable."** Pricing lives on `/pricing` — shoehorning it here muddies the argument.
**Alt 3: Icons on each card.** Deferred until lesson 109 when we decide on a curated Phosphor set.

## What could go wrong

**Symptom:** Grid cards wrap awkwardly on xs (320px).
**Cause:** `minmax(16rem, 1fr)` forces cards to be at least 256px wide.
**Fix:** Expected — on xs, the grid collapses to a single column.

## Verify

```bash
pnpm check && pnpm build
pnpm dev  # scroll to the new section, cards stagger in
```

## Mistake log

- Copy called the three things "pillars" — cliché. Swapped to more direct headings.
- First iteration had 4 cards — argument got diluted. Three is the rule of threes.

## Commit

```bash
git add src/lib/components/marketing/ValueProp.svelte src/routes/+page.svelte
git add curriculum/module-06-marketing/lesson-095-value-prop.md
git commit -m "feat(marketing): ValueProp section on landing + lesson 095"
```
