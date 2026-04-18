---
number: 83
commit: a1e828d8b58c977cb85d52c42ef058a1f276db56
slug: subscription-lifecycle-ui
title: Wire status banners into the subscription rows
module: 5
moduleSlug: product
moduleTitle: Product
phase: 5
step: 21
previous: 82
next: null
estimatedMinutes: 10
filesTouched:
  - src/routes/account/billing/+page.svelte
---

## Context

Lessons 077 and 078 shipped three presentational components (`RenewalBanner`, `TrialCountdown`, `PastDueWarning`) but nothing rendered them. This lesson integrates them into the subscription list on `/account/billing`.

Which banner shows per subscription follows from the `subscriptions.status` enum:

- `trialing` → `TrialCountdown` + `RenewalBanner` ("Renews in N days" = trial end = next charge)
- `active` → `RenewalBanner`
- `past_due` or `unpaid` → `PastDueWarning` (overrides everything else)
- `cancelled` or `paused` → status chip only, no banners

## The command

`src/routes/account/billing/+page.svelte` — add the imports and a `.row-banners` container inside each subscription row:

```svelte
<div class="row-banners">
  {#if sub.status === 'past_due' || sub.status === 'unpaid'}
    <PastDueWarning subscriptionId={sub.id} updatePaymentUrl="/account/billing" />
  {/if}
  {#if sub.status === 'trialing' && sub.trialEnd !== null}
    <TrialCountdown trialEnd={sub.trialEnd} trialLengthDays={sub.price.trialPeriodDays ?? 14} />
  {/if}
  {#if (sub.status === 'active' || sub.status === 'trialing') && sub.currentPeriodEnd !== null}
    <RenewalBanner currentPeriodEnd={sub.currentPeriodEnd} cancelAtPeriodEnd={sub.cancelAtPeriodEnd} />
  {/if}
</div>
```

Move the inline "Cancels at period end" fragment from the row-side out; the RenewalBanner handles that state natively (`cancelling` variant).

```bash
pnpm check
```

## Why we chose this — the PE7 judgment

**Alternative 1: Inline the banner logic as `{#if status === 'past_due'}<div>…</div>{/if}` in the page.**
Grows unbounded as statuses multiply. Pulling into the component locks the presentation in one place.

**Alternative 2: Show all three banners simultaneously for debugging.**
Noisy and confusing. The status enum already expresses which "mode" the subscription is in; the banners mirror that enum.

**Alternative 3: Use a discriminated union helper that returns exactly one "which banner?" signal.**
Over-abstraction. The three `#if` blocks are readable and easy to extend.

The PE7 choice — **three `#if` blocks mapping to three components per row** — wins on readability and leaves room to add fourth / fifth banners (e.g., `ProratedCredit`) without refactoring.

## What could go wrong

**Symptom:** `TrialCountdown` renders for a subscription whose trial has ended but still has `status === 'trialing'`
**Cause:** Stripe hasn't fired the end-of-trial webhook yet.
**Fix:** `TrialCountdown` self-hides when `trialEnd <= now` (lesson 077). Behavior correct; ugly trailing gap if the trial-end hook is delayed.

**Symptom:** Banner shows `currentPeriodEnd` from a stale webhook
**Cause:** Row hasn't been updated since the user changed plans.
**Fix:** Stripe's `customer.subscription.updated` webhook (lesson 050) refreshes `currentPeriodEnd`. If the UI lags, the hook may not have run yet.

## Verify

```bash
pnpm check
pnpm build
pnpm dev
```

Seed + open `/account/billing` for a session that has a `past_due` subscription (persona #5 from lesson 056). The red PastDueWarning card dominates the row.

## Mistake log

- **Duplicated "Cancels at period end" in the row-side AND the RenewalBanner.** Removed the row-side copy; RenewalBanner's cancelling-variant is the single source of truth.
- **Passed `updatePaymentUrl={formAction}` to PastDueWarning.** The component renders an `<a>` — forms can't be the href target. Passed `/account/billing` and let the user click through to the portal button.

## Commit

```bash
git add src/routes/account/billing/+page.svelte
git add curriculum/module-05-product/lesson-083-subscription-lifecycle-ui.md
git commit -m "feat(account): wire subscription banners into billing + lesson 083"
```
