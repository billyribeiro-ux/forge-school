---
number: 84
slug: lifetime-ui
title: Render lifetime purchases distinctly on /account/billing
module: 5
moduleSlug: product
moduleTitle: Product
phase: 5
step: 22
previous: 83
next: null
estimatedMinutes: 10
filesTouched:
  - src/routes/account/billing/+page.server.ts
  - src/routes/account/billing/+page.svelte
---

## Context

A lifetime purchase is fundamentally different from a subscription: it has no renewal, no trial, no "past due" — just a one-time `checkout.session.completed` followed by a permanent entitlement row. Showing it in the same list as subscriptions is misleading.

This lesson adds a dedicated "Lifetime access" card on `/account/billing` that only renders when the session has at least one `source='purchase'` entitlement on a `kind='lifetime'` product. Distinctive styling (subtle gradient, permanent badge) so the user knows they own this forever.

## The command

`src/routes/account/billing/+page.server.ts` — add `getSessionEntitlementsWithKind` (from lesson 074) + derive the lifetime subset:

```ts
const [subscriptions, payments, entitlements, entitlementsWithKind] = await Promise.all([
  listSubscriptionsForSession(db, sessionId),
  listCompletedOrdersForSession(db, sessionId),
  listEntitlementsForSession(db, sessionId),
  getSessionEntitlementsWithKind(db, sessionId)
]);
const lifetimeEntitlements = entitlementsWithKind.filter(
  (e) => e.source === 'purchase' && e.productKind === 'lifetime'
);
return { …, lifetimeEntitlements };
```

`+page.svelte` — add a `.lifetime-card` section above the purchase history:

```svelte
{#if data.lifetimeEntitlements.length > 0}
  <section class="card lifetime-card">
    <header class="card-header">
      <h2><span class="crown">◆</span> Lifetime access</h2>
      <span class="lifetime-badge">Permanent</span>
    </header>
    <p class="lifetime-copy">One-time purchase. No renewals …</p>
    <ul class="list">
      {#each data.lifetimeEntitlements as ent (ent.id)}
        <li class="row small">
          <p class="row-meta">Granted {formatDate(ent.grantedAt)} · source <strong>{ent.source}</strong></p>
        </li>
      {/each}
    </ul>
  </section>
{/if}
```

CSS uses `linear-gradient(135deg, ...)` with `color-mix(in oklch, ...)` — OKLCH mixing keeps the gradient hue-stable and matches the PE7 token system.

```bash
pnpm check
```

## Why we chose this — the PE7 judgment

**Alternative 1: Show lifetime purchases in the "Purchase history" list.**
Works technically but buries the most premium product behind a generic "Payment · $497.00" row. Lifetime is a category of ownership, not a receipt.

**Alternative 2: Add an `isLifetime` boolean on the subscription row.**
Subscriptions and lifetime purchases live in different tables; polymorphizing via a flag conflates them. The entitlement's `source` + the product's `kind` is the right join.

**Alternative 3: Use `color-mix` with `srgb` instead of `oklch`.**
`oklch` mixes perceptually — no muddy midpoints when blending brand color into the raised-bg. Required by the PE7 token architecture.

The PE7 choice — **dedicated card, sourced from the entitlement+kind join, OKLCH gradient** — wins on user clarity and aesthetic coherence with the token system.

## What could go wrong

**Symptom:** A user has a lifetime entitlement but the card doesn't render
**Cause:** `revoked_at IS NOT NULL` — the webhook revoked it after a refund (lesson 053).
**Fix:** Correct behavior. Refunded lifetimes are no longer lifetime-owned.

**Symptom:** A user sees "Granted Jun 3, 2025 · source purchase" but the original payment shows "Refunded" in purchase history
**Cause:** Partial refund; entitlement unchanged.
**Fix:** Revoke-on-refund handler (lesson 053) fires on FULL refunds; partials leave the entitlement intact. Expected behavior.

**Symptom:** Two lifetime rows render for the same product
**Cause:** A test user was granted an entitlement twice (e.g., refund → repurchase). Each grant is its own row.
**Fix:** Expected. Each row represents one grant history; the most recent one is the active one.

## Verify

```bash
pnpm check
pnpm build
```

Seed a persona with a lifetime purchase, visit `/account/billing`, confirm the Lifetime card appears above Purchase history with the gold-tinted gradient background.

## Mistake log

- **Joined entitlements → products inline on the page load** — re-implemented what `getSessionEntitlementsWithKind` already does. Reused the helper from lesson 074 instead.
- **Used `linear-gradient(to right, ...)`** — read wrong at the RTL locale test. Switched to `135deg` which rotates consistently.
- **Hard-coded `color-mix(in srgb, ...)`** — didn't match the brand hue in OKLCH tokens. Swapped to `in oklch`.

## Commit

```bash
git add src/routes/account/billing/+page.server.ts src/routes/account/billing/+page.svelte
git add curriculum/module-05-product/lesson-084-lifetime-ui.md
git commit -m "feat(account): dedicated lifetime access card + lesson 084"
```
