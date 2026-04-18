---
number: 53
slug: refund-dispute
title: Handle charge.refunded and charge.dispute.created
module: 4
moduleSlug: money
moduleTitle: Money
phase: 4
step: 14
previous: 52
next: null
estimatedMinutes: 20
filesTouched:
  - src/lib/server/stripe/webhook-handlers/refund-dispute.ts
  - src/lib/server/stripe/webhook-handlers/index.ts
---

## Context

Money also flows backward. Two events matter:

- **`charge.refunded`** — a full or partial refund on a one-time payment. **Full refund revokes the entitlement**; partial refund leaves it granted (customer got some money back but still has the product).
- **`charge.dispute.created`** — a chargeback. For v1, we log at `warn` level so operators notice. Automatic revoke on dispute open is aggressive — most disputes are won by the merchant — so we defer the dispute lifecycle to a future operator-review lesson.

This lesson closes the webhook-handler set. After it, every user-visible money state Stripe can surface has a mapped DB side-effect.

## The command

Create `src/lib/server/stripe/webhook-handlers/refund-dispute.ts`. Two handlers:

```ts
export async function handleChargeRefunded(event: Stripe.Event): Promise<void> {
  if (event.type !== 'charge.refunded') throw new Error('...');
  const charge = event.data.object;
  const paymentIntentId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent?.id ?? null;
  if (paymentIntentId === null) { logger.warn(..., '...'); return; }

  // Find our payment row
  const [payment] = await db.select().from(payments)
    .where(eq(payments.stripePaymentIntentId, paymentIntentId)).limit(1);
  if (payment === undefined) { logger.warn(...); return; }

  // Record every refund on the charge (idempotent on stripe_refund_id)
  for (const stripeRefund of charge.refunds?.data ?? []) {
    await db.insert(refunds).values({
      paymentId: payment.id,
      stripeRefundId: stripeRefund.id,
      status: stripeRefund.status ?? 'unknown',
      amountCents: stripeRefund.amount,
      reason: stripeRefund.reason ?? null
    }).onConflictDoNothing({ target: refunds.stripeRefundId });
  }

  // Flip payment status
  await db.update(payments).set({
    status: charge.amount_refunded >= charge.amount ? 'refunded' : 'partially_refunded'
  }).where(eq(payments.id, payment.id));

  // Full refund? revoke the purchase entitlement for that session.
  if (charge.amount_refunded >= charge.amount) {
    const [order] = await db.select().from(orders).where(eq(orders.id, payment.orderId)).limit(1);
    if (order !== undefined) {
      await db.update(entitlements)
        .set({ revokedAt: new Date() })
        .where(and(
          eq(entitlements.sessionId, order.sessionId),
          eq(entitlements.source, 'purchase')
        ));
    }
  }
}

export async function handleChargeDisputeCreated(event: Stripe.Event): Promise<void> {
  if (event.type !== 'charge.dispute.created') throw new Error('...');
  const dispute = event.data.object;
  logger.warn({ stripeEventId: event.id, disputeId: dispute.id, ... },
    '[webhook] charge.dispute.created (operator review)');
}
```

Wire into the dispatcher:

```diff
+import { handleChargeDisputeCreated, handleChargeRefunded } from './refund-dispute.ts';

   case 'invoice.payment_action_required': ...
+  case 'charge.refunded':         await handleChargeRefunded(event); return;
+  case 'charge.dispute.created':  await handleChargeDisputeCreated(event); return;
```

Verify:

```bash
pnpm check
pnpm build
```

End-to-end refund test (requires real Stripe + `stripe listen`):

```bash
# Complete a Lifetime purchase via /pricing.
# In the Stripe dashboard, open the payment, click "Refund payment", pick
# "Full refund" and Submit.
# Stripe sends charge.refunded to the local webhook.

docker exec forgeschool-postgres psql -U forgeschool -d forgeschool -c \
  "SELECT p.status, r.amount_cents, r.reason, e.revoked_at
   FROM payments p
   JOIN refunds r ON r.payment_id = p.id
   JOIN orders o ON o.id = p.order_id
   JOIN entitlements e ON e.session_id = o.session_id AND e.source = 'purchase'
   ORDER BY p.created_at DESC LIMIT 1;"
```

Expected: `status='refunded'`, `amount_cents=49700`, `reason=null or 'requested_by_customer'`, `revoked_at=<timestamp>`.

## Why we chose this — the PE7 judgment

**Alternative 1: Revoke on `charge.dispute.created` too**
Most disputes resolve in favor of the merchant. Revoking immediately punishes users who dispute in good faith before the resolution runs. We log at `warn` so operators can decide case-by-case. Automatic revoke on `dispute.funds_withdrawn` (when the bank actually pulls the money) is the right target for future automation.

**Alternative 2: Revoke on partial refunds**
A customer who gets a $100 discount refund on a $497 purchase still wants access. Partial refund = money partially back, product kept. Full refund = product returned.

**Alternative 3: Delete the payment + refund rows**
Loses the audit trail. Soft state changes (flip `status`, set `revoked_at`) preserve history for finance + operator review.

**Alternative 4: Iterate `charge.refunds.data` in a single query with `INSERT ... ON CONFLICT`**
Drizzle's `.values([...])` accepts an array; we could insert the whole list in one statement. The for-loop is more readable and the refund count per charge is typically 1. When it grows, switch.

The PE7 choice — full-refund-revokes-entitlement, partial-leaves-it, dispute-logs-only, audit-preserving soft-state writes — wins because it matches real commerce semantics without taking reversible automation too aggressively.

## What could go wrong

**Symptom:** Refund doesn't revoke the entitlement
**Cause:** The payment row wasn't linked to the refund's charge. Usually means `stripe_payment_intent_id` mismatch.
**Fix:** Check the payment row: `SELECT stripe_payment_intent_id FROM payments WHERE order_id = ...`. Should match the charge's payment_intent.

**Symptom:** Dispute event fires for a test charge and doesn't revoke
**Cause:** Expected. `charge.dispute.created` logs only in v1.
**Fix:** Not a bug. Operators review disputes via the Stripe dashboard; future lesson wires operator-initiated revoke.

## Verify

```bash
pnpm check
pnpm build
```
Expected: 0 errors.

## Mistake log — things that went wrong the first time I did this

- **Revoked all entitlements for the session on a partial refund.** Classic overshoot. Added the `charge.amount_refunded >= charge.amount` guard.
- **Used `.where(eq(entitlements.sourceRef, charge.id))`.** Source ref carries the Checkout Session id, not the charge id. Fixed to filter by session + source='purchase', matching how we wrote the entitlement in lesson 049.
- **Initially imported `orders` only to delete the row.** The orders table is append-only post-completion; a refund doesn't delete the order, it changes the payment's status + entitlement state. Kept the orders row intact.

## Commit this change

```bash
git add src/lib/server/stripe/webhook-handlers/refund-dispute.ts \
       src/lib/server/stripe/webhook-handlers/index.ts
git add curriculum/module-04-money/lesson-053-refund-dispute.md
git commit -m "feat(webhook): refund revokes entitlement + dispute log + lesson 053"
```

Every user-facing money state now maps to a handler. Lesson 054 refactors the grant / revoke logic into a dedicated `entitlements` module so the webhook handlers delegate the access-control decision rather than hand-write it inline.
