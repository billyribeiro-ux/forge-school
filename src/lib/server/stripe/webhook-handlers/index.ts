/**
 * Stripe webhook event dispatcher.
 *
 * The receiver (+server.ts) verifies the signature, dedupes, then
 * calls `dispatchEvent(event)`. This module maps event types to
 * typed handlers and logs + ignores unknown types.
 *
 * Adding a new event type:
 *   1. Write a handler file in this directory (e.g., invoice-paid.ts)
 *   2. Import it here and add the case to the switch.
 *
 * Keeping the dispatch inside a single switch (rather than a map of
 * functions) is deliberate: the compiler's exhaustiveness check on
 * `event.type` narrows each case to the right payload shape.
 */
import type Stripe from 'stripe';
import { logger } from '$lib/server/logger';
import { handleCheckoutSessionCompleted } from './checkout-completed.ts';

export async function dispatchEvent(event: Stripe.Event): Promise<void> {
	switch (event.type) {
		case 'checkout.session.completed':
			await handleCheckoutSessionCompleted(event);
			return;

		// Subscription / invoice / refund handlers land in lessons 050-053.
		// Until then, those events are logged-and-skipped.

		default:
			logger.info(
				{ stripeEventId: event.id, type: event.type },
				'[webhook] event type not handled yet'
			);
			return;
	}
}
