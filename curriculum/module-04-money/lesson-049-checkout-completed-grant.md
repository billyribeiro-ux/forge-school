---
number: 49
slug: checkout-completed-grant
title: Grant access on checkout.session.completed
module: 4
moduleSlug: money
moduleTitle: Money
phase: 4
step: 10
previous: 48
next: 50
estimatedMinutes: 25
filesTouched:
  - src/lib/server/stripe/webhook-handlers/checkout-completed.ts
---

## Context

The webhook receiver from lesson 048 dispatches `checkout.session.completed` to a skeleton handler that only logs. This lesson makes that handler do real work: read the session metadata, find the DB order, transition it from `open` to `complete`, write a `payments` row for one-time purchases, and grant an `entitlements` row. This is where the architecture's grant-on-webhook invariant gets enforced in code.

Two modes matter:

- **`session.mode === 'payment'`** — one-time purchase (Lifetime). The handler writes the payment row and grants the entitlement immediately.
- **`session.mode === 'subscription'`** — a subscription just got created. The handler updates the order to `complete` and leaves the entitlement grant to `customer.subscription.created` (lesson 050). Two events per subscription flow — the checkout-completed marks "payment succeeded," the subscription-created establishes the recurring-state row.

Every DB write is idempotent (`onConflictDoNothing` on business keys). Stripe can retry the same event hours later; the handler produces the same end state.

## The command

Rewrite `src/lib/server/stripe/webhook-handlers/checkout-completed.ts` to perform the actual grant. Flow:

1. Narrow `event.type`; read `session = event.data.object`.
2. Extract `forge_order_id`, `forge_session_id`, `forge_product_slug` from metadata. Abort early (log + return) if any is missing — a malformed session is a data-quality problem, not a user-facing error.
3. Look up the order by id. If missing, log + return (same reasoning).
4. Update the order: `status = 'complete'`, `total_cents = session.amount_total ?? existing`.
5. If `session.mode === 'payment' && session.payment_status === 'paid'`:
   - Insert a `payments` row keyed on `stripe_payment_intent_id` (onConflictDoNothing).
   - Find the product by slug.
   - Insert an `entitlements` row with `source: 'purchase'`, `source_ref: session.id`, onConflictDoNothing on the unique `(session_id, product_id, source)` constraint.
6. If `session.mode === 'subscription'`:
   - Log; entitlement arrives with the subscription event.

Handler pseudocode:

```ts
export async function handleCheckoutSessionCompleted(event: Stripe.Event): Promise<void> {
  if (event.type !== 'checkout.session.completed') throw new Error('...');
  const session = event.data.object;
  const forgeOrderId   = session.metadata?.['forge_order_id'] ?? null;
  const forgeSessionId = session.metadata?.['forge_session_id'] ?? null;
  const forgeProductSlug = session.metadata?.['forge_product_slug'] ?? null;
  if (forgeOrderId === null || forgeSessionId === null || forgeProductSlug === null) {
    logger.warn({...}, '[webhook] missing forge_* metadata; ignoring');
    return;
  }
  const [order] = await db.select().from(orders).where(eq(orders.id, forgeOrderId)).limit(1);
  if (order === undefined) { logger.warn({...}, '[webhook] order not found'); return; }
  await db.update(orders).set({ status: 'complete', totalCents: session.amount_total ?? order.totalCents, updatedAt: new Date() }).where(eq(orders.id, order.id));

  if (session.mode === 'payment' && session.payment_status === 'paid') {
    // payments + entitlements inserts, both idempotent
  } else if (session.mode === 'subscription') {
    logger.info({...}, '[webhook] subscription checkout complete; wait for customer.subscription.created');
  }
}
```

Verify:

```bash
pnpm check
pnpm build
```

End-to-end (requires real Stripe keys + `stripe listen`):

```bash
stripe listen --forward-to localhost:5173/api/webhooks/stripe
# (copy whsec_, restart pnpm dev)

# Open /pricing, click Start checkout on Lifetime, pay with 4242 ...
# Back-end check:
docker exec forgeschool-postgres psql -U forgeschool -d forgeschool \
  -c "SELECT o.status, e.source, e.revoked_at FROM orders o LEFT JOIN entitlements e ON e.session_id = o.session_id AND e.product_id IS NOT NULL ORDER BY o.created_at DESC LIMIT 5;"
```

Expected: the most recent order is `complete`, a matching entitlement has `source='purchase'`, `revoked_at=null`.

## Why we chose this — the PE7 judgment

**Alternative 1: Grant entitlements based on `session.metadata.forge_product_slug` only, skip the order update**
Works. Also breaks the order-table invariant that every paid session has a matching `complete` order. We want the DB to tell a consistent story; both tables update on grant.

**Alternative 2: Grant entitlements for subscriptions here too**
Subscriptions have a separate lifecycle (trialing → active → past_due → cancelled). Granting at checkout means the entitlement reflects "bought a subscription" regardless of trial state or later payment failures. The subscription webhooks (lesson 050) model state transitions correctly — the entitlement tracks them.

**Alternative 3: Use `stripe.checkout.sessions.retrieve(id, { expand: ['line_items.data.price.product'] })` instead of relying on metadata**
The expand call is authoritative — it fetches the current session including the exact product/price. Metadata is eventually consistent and we set it ourselves. We choose metadata because it avoids the extra Stripe API round-trip in the hot path AND because we wrote the metadata in lesson 045, so it's our own data.

**Alternative 4: Store `stripe_event_id` on the `entitlements` row**
Would let us correlate any granted entitlement back to its triggering event. Useful for post-mortem. The `source_ref` field currently holds the Checkout Session id; we could add an `event_id` column later. For v1, session id is enough correlation.

**Alternative 5: Mark `payments` row `paid_at = session.created` instead of `new Date()`**
`session.created` is the session open time; paid_at should be the payment time. The webhook fires near the payment moment; `new Date()` approximates it within a few seconds. Close enough for v1; we can switch to Stripe's `payment_intent.created` date via an expand in a future refinement.

The PE7 choice — idempotent order-complete + payment insert + entitlement grant, all keyed on metadata forge IDs, with subscription deferred to subscription-specific events — wins because it models the money-moved invariant and keeps each lifecycle (purchase, subscription) on its own rails.

## What could go wrong

**Symptom:** Handler runs, order stays `open`
**Cause:** Event not reaching the handler. Check the receiver's 200/500 response; check `webhook_events` table for the event id.
**Fix:** If `webhook_events` has the id, the handler ran but failed. Look at the pino log. If `webhook_events` doesn't have it, the signature check failed upstream — the secret is wrong.

**Symptom:** Entitlement inserted for the wrong product
**Cause:** `forge_product_slug` in session metadata doesn't match a real product row. Usually a test event with placeholder metadata.
**Fix:** Trigger a real purchase flow (via the /pricing UI) so the metadata matches. `stripe trigger checkout.session.completed` sends a synthetic event WITHOUT our metadata — expect the "missing forge_* metadata; ignoring" log line for those.

**Symptom:** Duplicate `payments` rows on retry
**Cause:** `onConflictDoNothing` target mismatch. Drizzle needs the column in a real unique index; we have one on `payments.stripe_payment_intent_id`.
**Fix:** Verify the schema has `uniqueIndex('payments_stripe_payment_intent_id_uq')` (lesson 020 shipped it). If retries still produce dupes, regenerate the migration and re-apply.

**Symptom:** Entitlement survives a refund
**Cause:** No — refund handling lands in lesson 053. Until then, refund events log-and-ignore.
**Fix:** Expected state. Lesson 053 refactors.

## Verify

```bash
pnpm check
pnpm build
```
Expected: 0 errors.

After a real Stripe checkout flow:

```bash
docker exec forgeschool-postgres psql -U forgeschool -d forgeschool -c \
  "SELECT status, total_cents FROM orders ORDER BY created_at DESC LIMIT 1; \
   SELECT source, revoked_at FROM entitlements ORDER BY granted_at DESC LIMIT 1; \
   SELECT status, amount_cents FROM payments ORDER BY created_at DESC LIMIT 1;"
```
Expected: `complete`, `49700`; `purchase`, `NULL`; `paid`, `49700`.

## Mistake log — things that went wrong the first time I did this

- **Granted the entitlement even when `payment_status !== 'paid'`.** Edge case: some Stripe flows fire `checkout.session.completed` on a session that later requires additional authentication. Added the explicit `payment_status === 'paid'` check to the branch.
- **Read `session.payment_intent` as a string always.** It's typed as `string | PaymentIntent | null` depending on whether the session was fetched with `expand`. In a webhook event, it's typically a string; I still handle the object case for robustness.
- **Forgot the Stripe session id in `source_ref`.** Without it, debugging a revoked entitlement months later is a dashboard crawl. Now every entitlement carries its originating session id.
- **Assumed subscription checkouts would produce all their side effects in this handler.** They don't — the subscription lifecycle has its own event stream. Deferring subscriptions to lesson 050 kept this handler focused on one-time payments.

## Commit this change

```bash
git add src/lib/server/stripe/webhook-handlers/checkout-completed.ts
git add curriculum/module-04-money/lesson-049-checkout-completed-grant.md
git commit -m "feat(webhook): grant on checkout.session.completed + lesson 049"
```

One-time purchases now flow end-to-end: checkout → Stripe → webhook → order complete + payment + entitlement. Lesson 050 handles the subscription lifecycle's create/update/delete events.
