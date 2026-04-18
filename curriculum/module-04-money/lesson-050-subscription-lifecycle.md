---
number: 50
commit: ca7b26c2625fb7e2c7a0101ed4159678aa19aad3
slug: subscription-lifecycle
title: Handle subscription created / updated / deleted
module: 4
moduleSlug: money
moduleTitle: Money
phase: 4
step: 11
previous: 49
next: 51
estimatedMinutes: 30
filesTouched:
  - src/lib/server/stripe/webhook-handlers/subscription-lifecycle.ts
  - src/lib/server/stripe/webhook-handlers/index.ts
---

## Context

A subscription's life is a series of state transitions: `trialing` → `active` → `past_due` → `cancelled` / `unpaid`. Stripe emits an event for each transition. Our DB tracks the current state in the `subscriptions` row; our `entitlements` row reflects whether the subscriber has access right now.

Three events cover 95% of subscription lifetimes:

- **`customer.subscription.created`** — fires once when the subscription exists for the first time.
- **`customer.subscription.updated`** — fires on every state transition (trial ending, renewal, card failure, manual pause).
- **`customer.subscription.deleted`** — fires once when the subscription is canceled (including when a cancel-at-period-end reaches its period end).

We colocate all three handlers in `subscription-lifecycle.ts` because they share 80% of their logic (upsert the subscription row from the Stripe payload) and differ only in the entitlement side-effect.

## The command

Create `src/lib/server/stripe/webhook-handlers/subscription-lifecycle.ts` with four exports: three public handlers plus a private `upsertSubscription` helper.

Core data flow:

1. `readContext(event, expectedType)` — narrows the event, extracts `forge_session_id` + `forge_product_slug` from subscription metadata (which we set in lesson 045's `subscription_data.metadata`). Returns null with a log if metadata is missing.
2. `upsertSubscription(ctx)` — looks up our price row by `stripePriceId` (matching Stripe's subscription item), then `insert ... onConflictDoUpdate` on `stripe_subscription_id`. Captures `currentPeriodStart/End`, `cancelAtPeriodEnd`, `trialEnd`, `status`.
3. The three handlers each call `upsertSubscription` then decide the entitlement:
   - **created**: grant (insert entitlement with `source='subscription'` or `onConflictDoUpdate { revoked_at: null }` on re-delivery).
   - **updated**: grant if status is active/trialing/past_due; revoke if canceled/unpaid/incomplete_expired.
   - **deleted**: always revoke.

Key bits:

```ts
const primaryItem = subscription.items.data[0];
// Period dates live on the item, not the subscription (Stripe 2025+ API).
currentPeriodStart: new Date(primaryItem.current_period_start * 1000),
currentPeriodEnd:   new Date(primaryItem.current_period_end * 1000),
```

(Stripe's API moved period fields onto subscription items in 2025. Older examples read `subscription.current_period_start` — that's deprecated.)

The revoke uses `UPDATE ... SET revoked_at = now() WHERE source='subscription'` — soft revoke preserves the history; a subsequent grant clears `revoked_at` to null. Audit trail intact.

Wire the handlers into the dispatcher (`webhook-handlers/index.ts`):

```diff
+import {
+  handleSubscriptionCreated,
+  handleSubscriptionDeleted,
+  handleSubscriptionUpdated
+} from './subscription-lifecycle.ts';

 switch (event.type) {
   case 'checkout.session.completed': await handleCheckoutSessionCompleted(event); return;
+  case 'customer.subscription.created': await handleSubscriptionCreated(event); return;
+  case 'customer.subscription.updated': await handleSubscriptionUpdated(event); return;
+  case 'customer.subscription.deleted': await handleSubscriptionDeleted(event); return;
   default: ...
 }
```

Verify:

```bash
pnpm check
pnpm build
```

End-to-end (requires Stripe + `stripe listen`):

```bash
# Open /pricing, click Start checkout on Pro Monthly, pay with 4242.
# Confirm in the DB:
docker exec forgeschool-postgres psql -U forgeschool -d forgeschool -c "
  SELECT s.status, s.trial_end, e.source, e.revoked_at
  FROM subscriptions s
  LEFT JOIN entitlements e ON e.session_id = s.session_id AND e.source = 'subscription'
  ORDER BY s.created_at DESC LIMIT 1;"
```

Expected: `trialing` (Pro Monthly has a 7-day trial), `trial_end` 7 days out, entitlement with `source='subscription'`, `revoked_at=NULL`.

Simulate a cancellation via Stripe CLI:

```bash
stripe trigger customer.subscription.deleted
```

(Stripe's trigger uses a fixture, so it may not match your specific subscription — use the dashboard's "Cancel subscription" UI on your test subscription for a more faithful test.)

Expected: `entitlements.revoked_at` populated for that session.

## Why we chose this — the PE7 judgment

**Alternative 1: Separate files per event**
Three 40-line files sharing an `upsertSubscription` helper exported from a fourth file. Readable in isolation; painful to review because a PR touching all three needs four file opens. Single file with four named exports is reviewable in one scroll.

**Alternative 2: Ignore `customer.subscription.updated` entirely**
Possible if we only care about created + deleted. Breaks "past_due" handling — a failed renewal triggers an `updated` event with `status=past_due`. Without handling it, our subscription row stays `active` even while Stripe considers it delinquent. The dashboard shows one state, our DB another.

**Alternative 3: Re-fetch the subscription via `stripe.subscriptions.retrieve` instead of trusting the event payload**
Webhook payloads are Stripe's source of truth at the moment the event fires. Re-fetching costs latency + API quota and produces "newer" data that might confuse users who saw the state at the event moment. Trust the payload.

**Alternative 4: Hard-delete the entitlements row on subscription.deleted**
Loses the audit trail — "did this user ever have access?" becomes unanswerable. Soft revoke via `revoked_at` keeps the history without granting access.

**Alternative 5: Grant + revoke on a combined state tracker rather than entitlements**
We already have the subscriptions table for state tracking. Entitlements are the gating mechanism — every access check reads entitlements, not subscriptions. Keeping gating separate from state tracking means a subscription in `past_due` status can have its entitlement either granted (7-day grace period before revoke) or revoked (hard cutoff) independently.

The PE7 choice — colocated handlers, upsert-on-stripe-subscription-id, period dates from the subscription item, soft-revoke-preserving-audit — wins because it treats the subscriptions table as state, the entitlements table as access, and every webhook retry produces the same end state.

## What could go wrong

**Symptom:** `primaryItem.current_period_start is undefined`
**Cause:** Using an older Stripe API version that still exposes period fields on the subscription root. Our `apiVersion: '2026-03-25.dahlia'` places them on the item.
**Fix:** Keep the `primaryItem` read; adjust the API version in `stripe/client.ts` if you intentionally downgrade.

**Symptom:** Entitlement granted but gating code (future lesson) says no access
**Cause:** Entitlement row's `revoked_at` is stale from a prior cancellation; `onConflictDoUpdate { revoked_at: null }` isn't firing.
**Fix:** The `target: [sessionId, productId, source]` matches the unique index. If the conflict target doesn't match, Drizzle inserts a new row; two rows for the same tuple causes lookup ambiguity. Verify the schema's unique index matches.

**Symptom:** `customer.subscription.updated` fires dozens of times per subscription
**Cause:** Normal. Stripe updates fire on every state change: card update, invoice paid, trial ending. Each is an idempotent pass through the handler.
**Fix:** Nothing to fix; the upsert absorbs them all.

**Symptom:** Revoke doesn't reset `updated_at`
**Cause:** The revoke uses `UPDATE ... SET revoked_at`. We didn't add `updated_at: new Date()`. The schema's `$onUpdate` trigger (on Drizzle-side, not DB-side) handles updates that go through Drizzle's insert — but bare UPDATEs can miss it.
**Fix:** For entitlements we've committed to only `revoked_at` as the mutable signal; `updated_at` isn't in the column set. If we later add it, include `updatedAt: new Date()` in the UPDATE's set clause.

## Verify

```bash
pnpm check
pnpm build
```
Expected: 0 errors.

After a Pro Monthly checkout:

```bash
docker exec forgeschool-postgres psql -U forgeschool -d forgeschool -c \
  "SELECT status, trial_end FROM subscriptions ORDER BY created_at DESC LIMIT 1;"
```
Expected: `trialing`, timestamp 7 days in the future.

## Mistake log — things that went wrong the first time I did this

- **Read `subscription.current_period_start` at the subscription root.** Stripe's 2025 API moved it to the item. Fix: read from `subscription.items.data[0].current_period_start`. Caught by a TypeScript error — the SDK's types know the new shape.
- **Did the revoke as a DELETE.** Lost the audit trail. Converted to `UPDATE ... SET revoked_at = now()`. Historical rows stay; future queries filter on `revoked_at IS NULL`.
- **Granted via a plain INSERT.** First `customer.subscription.updated` after a revoke tried to re-grant by inserting; unique constraint violation. Switched to `onConflictDoUpdate { revoked_at: null }` — idempotent re-grant that clears prior revokes.
- **Forgot to handle the `paused` status.** Stripe added `paused` as a status in a recent API version. Our `subscription_status` enum doesn't include it — but the cast in the handler (`as 'trialing' | ...`) doesn't enforce the Stripe side. Added the enum to the schema in a follow-up; for this lesson we narrow `as` to the six values we support and accept that a `paused` status from Stripe would crash the upsert (preferred: fail loudly over silently accepting an unknown state).

## Commit this change

```bash
git add src/lib/server/stripe/webhook-handlers/subscription-lifecycle.ts \
       src/lib/server/stripe/webhook-handlers/index.ts
git add curriculum/module-04-money/lesson-050-subscription-lifecycle.md
git commit -m "feat(webhook): subscription created/updated/deleted handlers + lesson 050"
```

With the three subscription events wired, subscription-mode purchases now flow end-to-end: checkout → subscription created → entitlement granted; cancel → subscription deleted → entitlement revoked. Lesson 051 adds the trial-ending handler.
