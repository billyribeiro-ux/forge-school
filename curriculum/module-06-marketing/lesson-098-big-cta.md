---
number: 98
commit: f3cb489b76635fc38c1f3ed5549eaf9ab5b326dd
slug: big-cta
title: Add a closing BigCTA section
module: 6
moduleSlug: marketing
moduleTitle: Marketing
phase: 6
step: 7
previous: 97
next: null
estimatedMinutes: 10
filesTouched:
  - src/lib/components/marketing/BigCTA.svelte
  - src/routes/+page.svelte
---

## Context

After the PE7 callout, one more beat pushing the user toward `/pricing`. Bold headline, 2-sentence lede, two CTAs (primary: See plans, secondary: Browse curriculum). Gradient background that leans on `color-mix(in oklch, ...)` to blend brand hue into the page background.

## The command

`src/lib/components/marketing/BigCTA.svelte` — single section, center-aligned, `linear-gradient(135deg, bg → brand-tinted-bg)`. Mount at the end of `+page.svelte` inside `<main>`.

```bash
pnpm check
```

## Why we chose this — the PE7 judgment

**Alt 1: Mid-page CTA.** Users who scrolled this far are leaning in — the closing slot converts better.
**Alt 2: Full-bleed brand background.** Too heavy; dilutes the brand's primary use on CTAs.
**Alt 3: Repeat the hero's CTA verbatim.** Different intent — the hero invites exploration, the close urges commitment.

## Verify

`pnpm check && pnpm build`. Visit `/`, scroll to bottom, see the gradient closing CTA.

## Mistake log

- First gradient used `to right` — less dramatic than `135deg`. Bumped.
- Didn't wrap in `RevealOnScroll` initially — the closing CTA looks flat when scrolled past. Added.

## Commit

```bash
git add src/lib/components/marketing/BigCTA.svelte src/routes/+page.svelte
git add curriculum/module-06-marketing/lesson-098-big-cta.md
git commit -m "feat(marketing): BigCTA closing section + lesson 098"
```
