---
number: 138
slug: instrument-events
title: Instrument the full custom-event funnel
module: 9
moduleSlug: followup
moduleTitle: v1.0 Follow-up
phase: 9
step: 3
previous: 137
next: null
estimatedMinutes: 10
filesTouched:
  - src/routes/cart/+page.svelte
  - src/routes/checkout/success/+page.svelte
  - src/routes/contact/+page.svelte
---

## Context

Lesson 112 typed the `track()` helper + wired `add_to_cart`. PROMPT step 113 asks for the full set: `signup` (no auth in v1 — skip), `checkout_started`, `checkout_completed`, `subscription_started` + `lifetime_purchased` (server-side webhook events — surface from `/checkout/success` once entitlement lands), `coupon_applied`, `contact_submitted`. This lesson wires all the client-visible call sites.

## The command

`src/routes/cart/+page.svelte`:

```diff
+ import { track } from '$lib/analytics/events';

  const applied = $derived(data.appliedCoupon);

+ let lastTrackedCoupon = $state<string | null>(null);
+ $effect(() => {
+   if (applied !== null && applied.code !== lastTrackedCoupon) {
+     track('coupon_applied', { code: applied.code });
+     lastTrackedCoupon = applied.code;
+   }
+ });

+ function trackCheckoutStarted(): void {
+   track('checkout_started', { itemCount: String(cart.items.length), subtotalCents: String(cart.subtotalCents) });
+ }

  <form method="POST" action="/cart/checkout" onsubmit={trackCheckoutStarted}>
```

`src/routes/checkout/success/+page.svelte`:

```diff
+ import { track } from '$lib/analytics/events';
+ $effect(() => {
+   if (data.sessionId !== null && data.sessionId !== '') {
+     track('checkout_completed', { stripeCheckoutSessionId: data.sessionId });
+   }
+ });
```

`src/routes/contact/+page.svelte`:

```diff
+ import { track } from '$lib/analytics/events';
+ $effect(() => { if (sent) track('contact_submitted'); });
```

```bash
pnpm check
```

## Why we chose this — the PE7 judgment

**Alt 1: Server-side fire of `subscription_started` from the webhook handler.** Plausible's HTTP API supports server-side events but loses the user's session affinity (no IP, no UA). Better: fire from the next page load that tells the user "you're now subscribed."
**Alt 2: Track on every quantity tick.** Noise. The funnel events are what matter.
**Alt 3: Use `dataLayer.push` (GTM-style).** No GTM in the stack; Plausible's `window.plausible(event, props)` is the native API.

`subscription_started` and `lifetime_purchased` are intentionally NOT wired here — both surface server-side via the webhook. Lesson 139 (or a future one) extends `/checkout/success` to read `data.entitlementJustGranted` and fire the appropriate event. For now `checkout_completed` is the funnel-bottom signal both subscription and lifetime purchases share.

## What could go wrong

**Symptom:** Coupon event fires twice for the same code on rerender
**Cause:** `$effect` runs whenever any dependency changes.
**Fix:** Track the last-seen code in `$state` and gate the call on a real change.

**Symptom:** `onsubmit` handler doesn't fire because the form action is a SvelteKit progressively-enhanced submit
**Cause:** `use:enhance` would intercept; we don't use it on this form. Native form submission fires `onsubmit` synchronously, then navigates.
**Fix:** Native flow is correct here — Plausible's `window.plausible` enqueues the event before the request fires, so even a fast navigation captures it.

## Verify

`pnpm check && pnpm build`. Manually open Plausible's "Test events" panel + add an item, apply a coupon, hit Checkout. Three events arrive in order.

## Mistake log

- Initial `$effect` fired `coupon_applied` on every load even when the coupon was already applied. The `lastTrackedCoupon` guard fixes the double-fire.
- Didn't guard `data.sessionId === ''` — empty string still triggered `checkout_completed`. Added the explicit empty check.

## Commit

```bash
git add src/routes/cart/+page.svelte src/routes/checkout/success/+page.svelte src/routes/contact/+page.svelte
git add curriculum/module-09-followup/lesson-138-instrument-events.md
git commit -m "feat(analytics): instrument checkout/coupon/contact funnel + lesson 138"
```
