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
import { handleTrialWillEnd } from './trial-will-end.ts';
import {
	handleInvoicePaid,
	handleInvoicePaymentActionRequired,
	handleInvoicePaymentFailed
} from './invoice-events.ts';

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
		case 'customer.subscription.trial_will_end':
			await handleTrialWillEnd(event);
			return;
		case 'invoice.paid':
			await handleInvoicePaid(event);
			return;
		case 'invoice.payment_failed':
			await handleInvoicePaymentFailed(event);
			return;
		case 'invoice.payment_action_required':
			await handleInvoicePaymentActionRequired(event);
			return;

		// Refund / dispute handlers land in lesson 053.

		default:
			logger.info(
				{ stripeEventId: event.id, type: event.type },
				'[webhook] event type not handled yet'
			);
			return;
	}
}
