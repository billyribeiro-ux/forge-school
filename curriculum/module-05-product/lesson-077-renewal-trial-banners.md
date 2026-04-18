---
number: 77
commit: baf34b2138f643c8bd62af187f5d286a0605be4b
slug: renewal-trial-banners
title: Build RenewalBanner + TrialCountdown components
module: 5
moduleSlug: product
moduleTitle: Product
phase: 5
step: 15
previous: 76
next: null
estimatedMinutes: 20
filesTouched:
  - src/lib/components/entitlement/RenewalBanner.svelte
  - src/lib/components/entitlement/TrialCountdown.svelte
---

## Context

Two subtle-but-critical subscription affordances:

- **`RenewalBanner`** — a one-line inline notice. Renders "Renews in 3 days" for active subscriptions, "Your plan ends on September 14, 2026" for subscriptions the user has clicked cancel on. Pulls state from two fields (`currentPeriodEnd`, `cancelAtPeriodEnd`) already mirrored from Stripe webhooks.
- **`TrialCountdown`** — a small progress bar showing how much of the free trial is consumed. Hides itself when the trial has ended so callers can drop it anywhere.

Both are pure presentational — zero DB, zero effects, one `$derived` each.

## The command

`src/lib/components/entitlement/RenewalBanner.svelte`:

```svelte
<script lang="ts">
  type Props = { currentPeriodEnd: Date; cancelAtPeriodEnd: boolean };
  let { currentPeriodEnd, cancelAtPeriodEnd }: Props = $props();

  const message = $derived(
    cancelAtPeriodEnd
      ? `Your plan ends on ${formatAbsoluteDate(currentPeriodEnd)}.`
      : `Renews ${formatRelativeDays(currentPeriodEnd)}.`
  );
</script>
<p class="renewal" class:cancelling={cancelAtPeriodEnd}>{message}</p>
```

`formatRelativeDays` is a tight local helper: `today` / `tomorrow` / `in N days` / `in about N weeks` / `on Month DD, YYYY`. No `date-fns`.

`src/lib/components/entitlement/TrialCountdown.svelte`:

```svelte
<script lang="ts">
  type Props = { trialEnd: Date; trialLengthDays?: number };
  let { trialEnd, trialLengthDays = 14 }: Props = $props();

  const msPerDay = 1000 * 60 * 60 * 24;
  const now = Date.now();
  const endMs = trialEnd.getTime();
  const daysLeftRaw = (endMs - now) / msPerDay;
  const daysLeft = $derived(Math.max(0, Math.ceil(daysLeftRaw)));
  const elapsedDays = $derived(Math.max(0, trialLengthDays - daysLeft));
  const percentElapsed = $derived(Math.min(100, (elapsedDays / trialLengthDays) * 100));
  const ended = daysLeftRaw <= 0;
</script>
{#if !ended}
  <section class="trial" aria-label="Free trial status">
    <p>{daysLeft} days left in your free trial</p>
    <div class="bar" role="progressbar" aria-valuenow={Math.round(percentElapsed)} aria-valuemin={0} aria-valuemax={100}>
      <div class="fill" style:inline-size="{percentElapsed}%"></div>
    </div>
  </section>
{/if}
```

`style:inline-size` is the logical-property equivalent of `style:width` (matches our PE7 CSS conventions). `aria-valuenow` rounds so screen readers read whole-number percents.

```bash
pnpm check
```

## Why we chose this — the PE7 judgment

**Alternative 1: Reactive clock ticking (set a 1-minute interval that re-computes `daysLeft`).**
Pointless. The trial changes at a granularity of days, not minutes. The component re-mounts on navigation; the page-load snapshot is always within 24 hours of truth.

**Alternative 2: `date-fns` / `dayjs` for relative-time formatting.**
Adds a dependency for the five branches `formatRelativeDays` covers inline. Revisit when the UI needs localized relative times (the marketing site in Module 6 may).

**Alternative 3: Pull subscription state from a store.**
The components are reusable — e.g., the Upgrade flow in Module 6 could render a `<TrialCountdown trialEnd={futureTrialEnd}>` for a preview. Props keep them decoupled.

**Alternative 4: Render `TrialCountdown` even when expired, with a "Trial ended" state.**
Null-render keeps the caller's markup clean — they can always drop the component on the page, and it simply vanishes when there's nothing to show. Callers wanting "trial ended" copy render a separate banner.

The PE7 choice — **pure, prop-driven, conditionally self-hiding** — wins on composability.

## What could go wrong

**Symptom:** `daysLeft` reads 8 when Stripe reports 7
**Cause:** Timezone skew — `new Date()` is UTC inside the server render but the user thinks in local time.
**Fix:** Acceptable for v1. The component renders a marketing-grade count, not a legal deadline. When we render billing-period dates in lesson 055 (the account page), we use `dateStyle: 'long'` which localizes.

**Symptom:** Progress bar jumps from 0% to 100% when trial starts
**Cause:** `trialLengthDays` defaulted to 14 but Stripe returned a 7-day trial, so percent-elapsed flipped from 100% (day 1 of a 7-day → day 1 of a 14-day = 7.14% elapsed, not 100%).
**Fix:** Always pass the correct `trialLengthDays` from the caller that knows the plan. Defaulting to 14 is a fallback for unknown plans.

**Symptom:** Screen reader reads "0 percent" when trial just started
**Cause:** `aria-valuenow` is 0 — technically correct.
**Fix:** Acceptable. Users typically hear the text label "N days left" before the progress bar.

## Verify

```bash
pnpm check
```

Manual render (in a scratch route or Storybook if we add one later):

```svelte
<RenewalBanner currentPeriodEnd={new Date('2026-09-14')} cancelAtPeriodEnd={false} />
<RenewalBanner currentPeriodEnd={new Date('2026-09-14')} cancelAtPeriodEnd={true} />
<TrialCountdown trialEnd={new Date(Date.now() + 1000*60*60*24*5)} trialLengthDays={14} />
```

## Mistake log

- **First draft used `animate()` from Motion to tween the progress bar width.** Motion's type surface doesn't accept the shape I wrote; dropped for a CSS `transition: inline-size 300ms`, which also respects `prefers-reduced-motion` through a media query.
- **Computed `daysLeft` with `Math.floor` instead of `Math.ceil`.** 23 hours left showed as "0 days" — users would think the trial had ended. `ceil` puts the off-by-one in the right direction.
- **Used `style:width`** — breaks logical-property discipline. Swapped for `style:inline-size`.

## Commit

```bash
git add src/lib/components/entitlement/RenewalBanner.svelte src/lib/components/entitlement/TrialCountdown.svelte
git add curriculum/module-05-product/lesson-077-renewal-trial-banners.md
git commit -m "feat(components): RenewalBanner + TrialCountdown + lesson 077"
```
