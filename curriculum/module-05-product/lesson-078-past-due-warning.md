---
number: 78
commit: b9298269a2705fb35d9adffa5aa0c5030bcef476
slug: past-due-warning
title: Build the PastDueWarning alert component
module: 5
moduleSlug: product
moduleTitle: Product
phase: 5
step: 16
previous: 77
next: null
estimatedMinutes: 10
filesTouched:
  - src/lib/components/entitlement/PastDueWarning.svelte
---

## Context

When Stripe fails to charge the saved card (`invoice.payment_failed`), the subscription transitions to `past_due`. The user has a grace window before Stripe fires `subscription.deleted` — lesson 052 handles that webhook. In the meantime the UI needs to scream at the user that something's wrong.

`PastDueWarning` is that scream. Props: `subscriptionId` (for analytics / tests) and `updatePaymentUrl` (the Billing Portal URL from lesson 055). Renders a redundant-signal alert — color + icon + heading + `role="alert"` + `aria-live="assertive"`.

## The command

`src/lib/components/entitlement/PastDueWarning.svelte`:

```svelte
<script lang="ts">
  type Props = { subscriptionId: string; updatePaymentUrl: string };
  let { subscriptionId, updatePaymentUrl }: Props = $props();
</script>
<aside class="past-due" role="alert" aria-live="assertive" data-subscription-id={subscriptionId}>
  <div class="icon" aria-hidden="true">!</div>
  <div class="body">
    <h3>Payment failed</h3>
    <p>We couldn't charge your card for the latest invoice. Update your payment method to keep access.</p>
  </div>
  <a class="cta" href={updatePaymentUrl}>Update payment →</a>
</aside>
```

CSS uses a 4px left-border accent in the danger color, a pulse animation on `box-shadow` (disabled by `prefers-reduced-motion`), and a strong CTA button styling the danger color.

```bash
pnpm check
```

## Why we chose this — the PE7 judgment

**Alternative 1: Email-only notification.**
Users who didn't open the email still lose access. Critical-state UI belongs in the app too.

**Alternative 2: Blocking modal overlay.**
Users have work to get back to; a modal that blocks clicks is hostile. The inline aside + CTA lets them act without being trapped.

**Alternative 3: Icon-only (no text) with color signal.**
Fails WCAG AA. Colorblind + screen-reader users wouldn't get the message. Redundancy (icon + heading + role) is the baseline.

**Alternative 4: Skip the pulse animation.**
A subtle pulse draws attention without being visually aggressive. Disabled under `prefers-reduced-motion` so users who've opted out of motion see a static card.

The PE7 choice — **inline alert + redundant signals + Billing-Portal deeplink** — wins on accessibility and on letting the user fix their problem in one click.

## What could go wrong

**Symptom:** Warning flashes on every page load even after card updated
**Cause:** The subscription's status hasn't re-sync'd from Stripe yet — the webhook for `invoice.paid` (or a manual reconciliation) needs to fire.
**Fix:** Caller should load the current subscription row from the DB (populated by webhooks, lessons 049-053). If that status still reads `past_due`, the warning is correct — the user's card update hasn't settled with Stripe yet.

**Symptom:** `updatePaymentUrl` is a raw Billing Portal endpoint (e.g., `/account/billing/portal`), and clicking it fires the POST but returns 405
**Cause:** Links issue GET requests; the portal handoff is POST.
**Fix:** Either wrap the CTA in a `<form method="POST">`, or pre-generate the Stripe Billing Portal URL server-side and pass it as the href. The second option matches lesson 055's pattern.

**Symptom:** Screen reader reads "Payment failed" twice on route change
**Cause:** Two instances mounted by parent — e.g., once in `+layout.svelte` and once in `+page.svelte`.
**Fix:** Mount once per view. The layout is the right place for global warnings.

## Verify

```bash
pnpm check
```

Manual: set a subscription's status to `past_due` via a SQL UPDATE, render the `/account/billing` page (module 4 lesson 055), confirm the warning renders above the subscription details.

## Mistake log

- **Used `role="status"` first draft.** `status` is polite / low-priority; payment failure is assertive. Switched to `role="alert"` + `aria-live="assertive"`.
- **Hard-coded the portal URL as `/account/billing`.** Caller needs flexibility to pass the Stripe-generated portal URL. Made it a required prop.
- **Didn't scope the pulse `@keyframes` to the component.** Svelte scoping handles this automatically; no extra work needed, but confirmed by checking the compiled output had `.svelte-hash` suffixes on the keyframe name.

## Commit

```bash
git add src/lib/components/entitlement/PastDueWarning.svelte
git add curriculum/module-05-product/lesson-078-past-due-warning.md
git commit -m "feat(components): PastDueWarning alert + lesson 078"
```
