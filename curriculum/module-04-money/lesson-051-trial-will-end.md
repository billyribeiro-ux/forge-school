---
number: 51
commit: 4a3830f93655728488cd03e0adc78824c307cd8d
slug: trial-will-end
title: Handle customer.subscription.trial_will_end
module: 4
moduleSlug: money
moduleTitle: Money
phase: 4
step: 12
previous: 50
next: 52
estimatedMinutes: 10
filesTouched:
  - src/lib/server/stripe/webhook-handlers/trial-will-end.ts
  - src/lib/server/stripe/webhook-handlers/index.ts
---

## Context

`customer.subscription.trial_will_end` fires approximately 3 days before a subscription's trial period ends. It's Stripe's "give your user a heads-up" signal — a chance to email them a reminder that they're about to be billed.

v1 doesn't ship the transactional email pipeline yet (Resend lands with the marketing form in Module 6). So this handler's v1 job is narrow: **log the event with enough context that the future email-sending PR is a one-file change.** When Resend is wired, the handler body grows from a `logger.info` to `logger.info` + `await sendTrialEndingEmail(...)`. No churn elsewhere.

## The command

Create `src/lib/server/stripe/webhook-handlers/trial-will-end.ts`:

```ts
import type Stripe from 'stripe';
import { logger } from '$lib/server/logger';

export async function handleTrialWillEnd(event: Stripe.Event): Promise<void> {
  if (event.type !== 'customer.subscription.trial_will_end') {
    throw new Error(`[webhook] wrong handler for event type ${event.type}`);
  }
  const subscription = event.data.object;
  const sessionId   = subscription.metadata?.['forge_session_id']   ?? null;
  const productSlug = subscription.metadata?.['forge_product_slug'] ?? null;
  const trialEnd    = subscription.trial_end !== null
    ? new Date(subscription.trial_end * 1000) : null;

  logger.info(
    { stripeEventId: event.id, subscriptionId: subscription.id, sessionId, productSlug, trialEnd },
    '[webhook] trial_will_end (notify subscriber)'
  );
}
```

Wire into the dispatcher:

```diff
 import { handleSubscriptionCreated, handleSubscriptionDeleted, handleSubscriptionUpdated } from './subscription-lifecycle.ts';
+import { handleTrialWillEnd } from './trial-will-end.ts';

   case 'customer.subscription.deleted': ...
+  case 'customer.subscription.trial_will_end':
+    await handleTrialWillEnd(event);
+    return;
```

Verify:

```bash
pnpm check
pnpm build
stripe trigger customer.subscription.trial_will_end
```

Expected: pino log line with subscription id, trial_end date. No DB changes.

## Why we chose this — the PE7 judgment

**Alternative 1: Skip the handler; let the event fall through to the "unknown type" log**
Default behavior logs "event type not handled yet." Works, but disguises the decision to defer email-sending as an oversight. A dedicated handler with the "TODO: send email" comment is explicit about the deferred work.

**Alternative 2: Implement the email now via Resend**
Resend isn't in the stack yet. The install + API key + sender verification + template wiring is its own lesson. We keep this lesson narrow; the email can land with Module 6's contact-form lesson (which also uses Resend).

**Alternative 3: Send an in-app notification instead of email**
Requires an in-app notification system (cookie-based messages, UI indicators) we haven't built. Email is the cross-session channel that doesn't need the user to be active on the site.

The PE7 choice — log now, send email when the channel exists — wins because the handler surface is correct (one event → one handler) and the future-work marker is explicit in code.

## What could go wrong

**Symptom:** Handler never fires
**Cause:** The subscription has no trial. Stripe only emits `trial_will_end` for subscriptions with `trial_period_days`.
**Fix:** Pro Monthly + Pro Yearly both have trials (7 and 14 days). If you see no events during a long test, confirm the subscription object has `trial_end` set in the dashboard.

**Symptom:** Log line shows `null` for `sessionId` / `productSlug`
**Cause:** Subscription was created before we were setting metadata (or `stripe trigger` used a synthetic event without our metadata).
**Fix:** Real subscriptions from our checkout have metadata. Synthetic triggers don't — expected.

## Verify

```bash
pnpm check
pnpm build
```
Expected: 0 errors.

## Mistake log — things that went wrong the first time I did this

- **Tried to send the email here and install Resend.** Scope crept — the install wasn't in the "files touched" list. Reverted to log-only; the actual email-sending lesson is queued for Module 6 when Resend lands for the contact form.
- **Logged `subscription.trial_end` as a number.** Stripe's `trial_end` is a Unix timestamp in seconds. Logged as a Date via `new Date(value * 1000)` so pino-pretty renders it readably.
- **Registered the switch case after the default branch by accident.** Unreachable. TypeScript flagged with `case in switch statement that follows default`. Moved above the default.

## Commit this change

```bash
git add src/lib/server/stripe/webhook-handlers/trial-will-end.ts \
       src/lib/server/stripe/webhook-handlers/index.ts
git add curriculum/module-04-money/lesson-051-trial-will-end.md
git commit -m "feat(webhook): handle trial_will_end event + lesson 051"
```

Lesson 052 adds the three invoice events — `.paid`, `.payment_failed`, `.payment_action_required` — for the subscription renewal path.
