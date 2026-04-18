/**
 * POST /api/webhooks/stripe
 *
 * Stripe webhook receiver.
 *
 * Contract:
 *  1. Read the raw request body (signature is over the raw bytes).
 *  2. Verify `stripe-signature` header against STRIPE_WEBHOOK_SECRET.
 *  3. Idempotency: insert the event id into `webhook_events` with
 *     ON CONFLICT DO NOTHING. If the insert returns a row, this is
 *     the first time we've seen the event; dispatch. If the insert
 *     is a no-op (duplicate id), respond 200 without work.
 *  4. Return 200 within 10 seconds (Stripe's timeout).
 *
 * Signature verification is the security boundary: without it, anyone
 * could POST synthetic events and trigger our handlers. With it,
 * only payloads signed by our Stripe account's webhook secret pass.
 */
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
		logger.error({}, '[webhook] STRIPE_WEBHOOK_SECRET is not set; refusing events');
		return json({ error: 'webhook secret not configured' }, { status: 503 });
	}

	const signature = request.headers.get('stripe-signature');
	if (signature === null) {
		logger.warn({}, '[webhook] missing stripe-signature header');
		return json({ error: 'missing signature' }, { status: 400 });
	}

	const rawBody = await request.text();

	let event;
	try {
		event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
	} catch (err) {
		logger.warn(
			{ err: err instanceof Error ? { message: err.message } : err },
			'[webhook] signature verification failed'
		);
		return json({ error: 'invalid signature' }, { status: 400 });
	}

	// Idempotency: record the event; skip work on duplicates.
	const [inserted] = await db
		.insert(webhookEvents)
		.values({ stripeEventId: event.id, type: event.type })
		.onConflictDoNothing({ target: webhookEvents.stripeEventId })
		.returning({ id: webhookEvents.id });

	if (inserted === undefined) {
		logger.debug(
			{ stripeEventId: event.id, type: event.type },
			'[webhook] duplicate event; skipping'
		);
		return json({ received: true, duplicate: true });
	}

	try {
		await dispatchEvent(event);
	} catch (err) {
		logger.error(
			{
				stripeEventId: event.id,
				type: event.type,
				err: err instanceof Error ? { message: err.message, stack: err.stack } : err
			},
			'[webhook] handler threw'
		);
		// Return 500 so Stripe retries. The event is still in webhook_events,
		// so the idempotency check on retry will skip — that's a known race.
		// Lesson 054 refines: handlers are themselves idempotent, so a retry
		// after a partial failure is safe even without the dedupe table.
		return json({ error: 'handler failed' }, { status: 500 });
	}

	return json({ received: true });
};
