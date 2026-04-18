---
number: 48
commit: 905865234bcf0b212030a0df9972577a992e2c2c
slug: webhook-receiver
title: Build the Stripe webhook receiver with signature verification
module: 4
moduleSlug: money
moduleTitle: Money
phase: 4
step: 9
previous: 47
next: 49
estimatedMinutes: 25
filesTouched:
  - src/routes/api/webhooks/stripe/+server.ts
  - src/lib/server/stripe/webhook-handlers/index.ts
  - src/lib/server/stripe/webhook-handlers/checkout-completed.ts
---

## Context

The webhook receiver at `/api/webhooks/stripe` is the single entry point for every Stripe event that affects our database. Four invariants this lesson enforces:

1. **Signature verification.** Stripe signs every webhook payload with the session's `STRIPE_WEBHOOK_SECRET`. The receiver uses `stripe.webhooks.constructEvent(rawBody, signatureHeader, secret)` to verify. Unsigned requests get 400; unverified requests never reach handler code.
2. **Raw body reading.** Stripe's signature is computed over the exact request body bytes. If SvelteKit parses the body as JSON, whitespace differences invalidate the signature. We call `request.text()` to get the raw string — no parsing, no transformation.
3. **Idempotency via `webhook_events` table.** Stripe delivers events at-least-once. The receiver inserts the `stripe_event_id` into `webhook_events` with `ON CONFLICT DO NOTHING`. If the insert succeeds, we process. If it's a duplicate, we respond 200 without re-processing. This table is the event-level idempotency ledger.
4. **Dispatch via type switch.** Each event type maps to one handler in `src/lib/server/stripe/webhook-handlers/`. A TypeScript switch on `event.type` narrows the payload shape per branch — the compiler catches mismatches between handler expectations and event shape.

This lesson ships the receiver, the dispatcher, and a skeleton handler for `checkout.session.completed`. Lesson 049 fills in that handler's grant logic. Lessons 050-053 add the remaining event types.

## The command

Create `src/routes/api/webhooks/stripe/+server.ts` — the POST handler:

```ts
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { STRIPE_WEBHOOK_SECRET } from '$env/static/private';
import { db } from '$lib/server/db';
import { webhookEvents } from '$lib/server/db/schema';
import { logger } from '$lib/server/logger';
import { stripe } from '$lib/server/stripe/client';
import { dispatchEvent } from '$lib/server/stripe/webhook-handlers';

export const POST: RequestHandler = async ({ request }) => {
  if (STRIPE_WEBHOOK_SECRET === '' || STRIPE_WEBHOOK_SECRET === 'whsec_replace_me') {
    return json({ error: 'webhook secret not configured' }, { status: 503 });
  }
  const signature = request.headers.get('stripe-signature');
  if (signature === null) return json({ error: 'missing signature' }, { status: 400 });

  const rawBody = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return json({ error: 'invalid signature' }, { status: 400 });
  }

  // Idempotency: insert the event id; duplicate inserts are no-ops.
  const [inserted] = await db.insert(webhookEvents)
    .values({ stripeEventId: event.id, type: event.type })
    .onConflictDoNothing({ target: webhookEvents.stripeEventId })
    .returning({ id: webhookEvents.id });

  if (inserted === undefined) {
    return json({ received: true, duplicate: true });
  }

  try {
    await dispatchEvent(event);
  } catch (err) {
    logger.error({ stripeEventId: event.id, type: event.type, err: ... }, '[webhook] handler threw');
    return json({ error: 'handler failed' }, { status: 500 });
  }
  return json({ received: true });
};
```

Create `src/lib/server/stripe/webhook-handlers/index.ts` — the dispatcher:

```ts
import type Stripe from 'stripe';
import { logger } from '$lib/server/logger';
import { handleCheckoutSessionCompleted } from './checkout-completed.ts';

export async function dispatchEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event);
      return;
    default:
      logger.info({ stripeEventId: event.id, type: event.type }, '[webhook] event type not handled yet');
      return;
  }
}
```

Create the skeleton handler at `src/lib/server/stripe/webhook-handlers/checkout-completed.ts`. For now, it logs and returns — lesson 049 fills in the grant logic:

```ts
import type Stripe from 'stripe';
import { logger } from '$lib/server/logger';

export async function handleCheckoutSessionCompleted(event: Stripe.Event): Promise<void> {
  if (event.type !== 'checkout.session.completed') {
    throw new Error(`[webhook] wrong handler for event type ${event.type}`);
  }
  const session = event.data.object;
  logger.info({ stripeEventId: event.id, sessionId: session.id, mode: session.mode, ... },
    '[webhook] checkout.session.completed received (lesson 049 adds grant)');
}
```

Verify:

```bash
pnpm check
pnpm build
```

Exercise the receiver end-to-end:

```bash
# Terminal 1: stripe listen
stripe listen --forward-to localhost:5173/api/webhooks/stripe
# -> copy the whsec_... into .env.local, restart pnpm dev

# Terminal 2: synthetic trigger
stripe trigger checkout.session.completed
```

Expected: dev server logs show `[webhook] checkout.session.completed received`. If the secret or signature is wrong, expect a 400.

## Why we chose this — the PE7 judgment

**Alternative 1: Skip signature verification**
Anyone on the internet could POST a fake `checkout.session.completed` event and trigger an access grant. Catastrophic. Signature verification is non-negotiable.

**Alternative 2: Parse the body as JSON instead of raw**
SvelteKit's default body parser strips whitespace and re-serializes. Stripe's signature is byte-exact; a re-serialized payload fails verification. Always use `request.text()`.

**Alternative 3: Skip the `webhook_events` dedupe table; rely on handler-level idempotency**
Handlers can be idempotent via `ON CONFLICT` on their own tables. Works, but means every future handler author must remember to make it idempotent. The event-level dedupe is a defense-in-depth layer that protects against author errors.

**Alternative 4: Dispatch via a `Map<EventType, Handler>` instead of a switch**
A map is concise, but TypeScript's narrowing on `event.type` — "inside this case, `event` is `Stripe.Event.CheckoutSessionCompleted`" — works best inside switch. The map approach loses that narrowing (or requires casts). Keep the switch.

**Alternative 5: Handle all events in a single monolithic file**
For 10+ event types, a 500-line file becomes hard to review. One handler per file; each handler is ~30 lines. PR diffs stay scoped.

The PE7 choice — signature-verified receiver with a webhook_events idempotency ledger and per-type handlers in separate files — wins because it's secure, duplicate-safe, reviewable, and typed end-to-end.

## What could go wrong

**Symptom:** 400 `invalid signature` on every event
**Cause:** `STRIPE_WEBHOOK_SECRET` in `.env.local` doesn't match the one `stripe listen` printed.
**Fix:** Copy the current `whsec_...` from the `stripe listen` terminal. Restart `pnpm dev`.

**Symptom:** 400 `missing signature` on Stripe CLI test events but real Stripe deliveries work
**Cause:** `stripe listen` forwards correctly; a `stripe trigger` against a DIFFERENT endpoint might not have a signature.
**Fix:** Ensure `stripe listen --forward-to ...` is running; `stripe trigger` needs an active listener to route through.

**Symptom:** Handler throws but events still marked processed
**Cause:** The dedupe happens BEFORE dispatch. On handler failure, we return 500; Stripe retries; the retry hits the dedupe and is a no-op.
**Fix:** Handlers must themselves be idempotent (lesson 054's entitlement grants use `ON CONFLICT DO UPDATE`). The webhook_events table is not a replacement for idempotent handlers; it's a first-order filter.

**Symptom:** `pnpm build` errors with "Cannot find module '$lib/server/stripe/webhook-handlers'"
**Cause:** The `index.ts` file extension isn't being picked up — usually a typo in the path.
**Fix:** Imports use `$lib/server/stripe/webhook-handlers` (no trailing slash, no `.ts`). Confirm the directory contains `index.ts`.

## Verify

```bash
# Files exist
ls src/routes/api/webhooks/stripe/+server.ts
ls src/lib/server/stripe/webhook-handlers/{index,checkout-completed}.ts

pnpm check
pnpm build
```
Expected: 0 errors.

```bash
# Synthetic event round-trip (requires stripe listen + real STRIPE_WEBHOOK_SECRET)
stripe trigger checkout.session.completed
```
Expected: 200 in dev server logs; `[webhook] checkout.session.completed received` message; one new row in webhook_events table.

## Mistake log — things that went wrong the first time I did this

- **Parsed the body with `request.json()` to log it.** Signature verification failed immediately — JSON parsing re-serialized the payload. Switched to `request.text()` for verification, then `JSON.parse` for logging.
- **Returned 200 on signature failures (defensive).** Stripe stopped retrying, and I missed a real-but-malformed event. Return 400 for signature failures; Stripe retries and debuggers see the error.
- **Ran handlers synchronously before returning 200.** A slow handler blocked Stripe's response window. For v1 our handlers finish in under a second; if a future handler does heavy work, offload to a job queue and return 200 immediately.
- **Didn't log the event id on signature failure.** Signature failures carry minimal info; the client-visible event id is one of the few diagnostics. Added `event.id` (when parsed) to the error log payload for post-mortem searches.

## Commit this change

```bash
git add src/routes/api/webhooks/stripe/+server.ts \
       src/lib/server/stripe/webhook-handlers/
git add curriculum/module-04-money/lesson-048-webhook-receiver.md
git commit -m "feat(webhook): Stripe receiver with sig verification + dispatcher + lesson 048"
```

With the receiver wired, every webhook Stripe sends reaches our dispatcher. Lesson 049 adds the real handler for `checkout.session.completed`.
