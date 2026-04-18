---
number: 52
slug: invoice-events
title: Handle invoice.paid / payment_failed / payment_action_required
module: 4
moduleSlug: money
moduleTitle: Money
phase: 4
step: 13
previous: 51
next: null
estimatedMinutes: 15
filesTouched:
  - src/lib/server/stripe/webhook-handlers/invoice-events.ts
  - src/lib/server/stripe/webhook-handlers/index.ts
---

## Context

Subscription renewals fire `invoice.*` events for every billing cycle. Three matter for v1:

- **`invoice.paid`** — successful renewal. The `customer.subscription.updated` event (lesson 050) tracks state changes; this one is a pure notification we log.
- **`invoice.payment_failed`** — card declined or expired. Stripe retries several times; during the retry window, the subscription moves to `past_due` status via a `subscription.updated` event — we keep the entitlement granted (grace period). Only when the subscription eventually transitions to `unpaid`/`canceled` does `subscription.updated` revoke the entitlement. So `invoice.payment_failed` itself logs; state transitions happen via the subscription event stream.
- **`invoice.payment_action_required`** — 3D Secure authentication needed. The user must authenticate on Stripe's hosted page. For v1 we log; email nudge comes with Resend in Module 6.

All three share a common logger pattern (invoice id, subscription id, amount, status, hosted_invoice_url). We colocate them in `invoice-events.ts` with a shared `logInvoice` helper.

## The command

Create `src/lib/server/stripe/webhook-handlers/invoice-events.ts`. Three exports plus one private helper:

```ts
function logInvoice(event: Stripe.Event, msg: string): void {
  const invoice = event.data.object as Stripe.Invoice;
  // Stripe 2025+ moved subscription reference off the root invoice.
  // Defensively read both shapes until we're on a version that only has one.
  const rawRoot = invoice as unknown as { subscription?: string | null };
  const parentDetails = invoice.parent as
    | { subscription_details?: { subscription?: string | null } | null } | null | undefined;
  const subscriptionId =
    rawRoot.subscription ?? parentDetails?.subscription_details?.subscription ?? null;

  logger.info(
    { stripeEventId: event.id, invoiceId: invoice.id, subscriptionId,
      amountDue: invoice.amount_due, amountPaid: invoice.amount_paid,
      status: invoice.status, hostedInvoiceUrl: invoice.hosted_invoice_url },
    msg
  );
}

export async function handleInvoicePaid(event: Stripe.Event): Promise<void> {
  if (event.type !== 'invoice.paid') throw new Error('...');
  logInvoice(event, '[webhook] invoice.paid');
}

export async function handleInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
  if (event.type !== 'invoice.payment_failed') throw new Error('...');
  logInvoice(event, '[webhook] invoice.payment_failed (grace period; revoke via subscription.updated)');
}

export async function handleInvoicePaymentActionRequired(event: Stripe.Event): Promise<void> {
  if (event.type !== 'invoice.payment_action_required') throw new Error('...');
  logInvoice(event, '[webhook] invoice.payment_action_required (notify subscriber)');
}
```

The Stripe 2025+ API moved the `subscription` reference off the Invoice root onto a `parent.subscription_details` structure. The dual-read supports both shapes while the ecosystem settles.

Wire into the dispatcher:

```diff
+import { handleInvoicePaid, handleInvoicePaymentActionRequired, handleInvoicePaymentFailed } from './invoice-events.ts';

   case 'customer.subscription.trial_will_end': ...
+  case 'invoice.paid':                        await handleInvoicePaid(event); return;
+  case 'invoice.payment_failed':              await handleInvoicePaymentFailed(event); return;
+  case 'invoice.payment_action_required':     await handleInvoicePaymentActionRequired(event); return;
```

Verify:

```bash
pnpm check
pnpm build
```
Expected: 0 errors.

```bash
stripe trigger invoice.paid
stripe trigger invoice.payment_failed
stripe trigger invoice.payment_action_required
```
Expected: pino log lines for each event type.

## Why we chose this — the PE7 judgment

**Alternative 1: Revoke the entitlement on `invoice.payment_failed`**
Hard-cuts access the moment a card fails. Users who updated their card minutes later see access restored, producing UI flashes. Instead we lean on Stripe's retry window (3-4 days) and rely on `subscription.updated` → `status=unpaid` as the actual revoke trigger.

**Alternative 2: Send an email from `invoice.payment_action_required` now**
Same reason as trial_will_end: email pipeline hasn't landed.

**Alternative 3: Update the subscription row from the invoice event**
Invoice events carry subscription context but don't represent subscription state transitions. The subscription events are the authoritative state stream. Writing to `subscriptions` from two event sources creates race conditions where an out-of-order invoice event could overwrite a newer subscription update.

**Alternative 4: Handle `invoice.finalized`, `invoice.payment_succeeded`, and similar sibling events**
Stripe emits 20+ invoice-related events; the three above are the ones that gate access decisions and user notifications. The rest are internal Stripe lifecycle events we don't care about.

The PE7 choice — log the three user-facing invoice outcomes, let subscription events own state — wins because it keeps the state machine single-sourced.

## What could go wrong

**Symptom:** TypeScript error on `invoice.subscription`
**Cause:** Stripe 2025+ API removed that field in favor of `invoice.parent.subscription_details.subscription`.
**Fix:** Our `logInvoice` reads both paths and falls back cleanly. If Stripe's types change further, adjust.

**Symptom:** `invoice.paid` fires but the user's subscription in our DB still shows `past_due`
**Cause:** Timing. `invoice.paid` may deliver before `subscription.updated`. Our handlers don't write to `subscriptions` here, so no race. The subscription row updates on its own event.
**Fix:** Expected behavior. Query the subscription row after the next `subscription.updated` event if you need the latest status.

## Verify

```bash
pnpm check
pnpm build
```
Expected: 0 errors.

## Mistake log — things that went wrong the first time I did this

- **Revoked entitlements on `invoice.payment_failed`.** Caused flickers during grace periods. Migrated the revoke to `subscription.updated` where it belongs.
- **Assumed `invoice.subscription` was still a string on the root.** TypeScript flagged it. Stripe's newer API shape moved it. Dual-read with a cast-through-unknown preserved backward compatibility without suppressing type errors.
- **Logged the raw invoice object.** Pino-pretty output was 500 lines per invoice. Reduced to the six fields that matter for operational debugging.

## Commit this change

```bash
git add src/lib/server/stripe/webhook-handlers/invoice-events.ts \
       src/lib/server/stripe/webhook-handlers/index.ts
git add curriculum/module-04-money/lesson-052-invoice-events.md
git commit -m "feat(webhook): invoice paid/failed/action_required + lesson 052"
```

Lesson 053 adds the final webhook handlers: `charge.refunded` and `charge.dispute.created` — the paths that revoke already-granted access when money flows backward.
