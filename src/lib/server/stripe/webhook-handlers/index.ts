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
import {
	handleSubscriptionCreated,
	handleSubscriptionDeleted,
	handleSubscriptionUpdated
} from './subscription-lifecycle.ts';

export async function dispatchEvent(event: Stripe.Event): Promise<void> {
	switch (event.type) {
		case 'checkout.session.completed':
			await handleCheckoutSessionCompleted(event);
			return;
		case 'customer.subscription.created':
			await handleSubscriptionCreated(event);
			return;
		case 'customer.subscription.updated':
			await handleSubscriptionUpdated(event);
			return;
		case 'customer.subscription.deleted':
			await handleSubscriptionDeleted(event);
			return;

		// Invoice / refund handlers land in lessons 051-053.

		default:
			logger.info(
				{ stripeEventId: event.id, type: event.type },
				'[webhook] event type not handled yet'
			);
			return;
	}
}
