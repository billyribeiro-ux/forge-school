/**
 * Stripe event: `customer.subscription.trial_will_end`
 *
 * Fires approximately 3 days before a trial ends. For v1, we log —
 * email notifications land in a future module once the transactional
 * email pipeline (Resend) is wired. Logging here establishes the hook
 * so the email-sending PR is a one-file change.
 */
import type Stripe from 'stripe';
import { logger } from '$lib/server/logger';

export async function handleTrialWillEnd(event: Stripe.Event): Promise<void> {
	if (event.type !== 'customer.subscription.trial_will_end') {
		throw new Error(`[webhook] wrong handler for event type ${event.type}`);
	}
	const subscription = event.data.object;
	const sessionId = subscription.metadata?.['forge_session_id'] ?? null;
	const productSlug = subscription.metadata?.['forge_product_slug'] ?? null;
	const trialEnd =
		subscription.trial_end !== null ? new Date(subscription.trial_end * 1000) : null;

	logger.info(
		{
			stripeEventId: event.id,
			subscriptionId: subscription.id,
			sessionId,
			productSlug,
			trialEnd
		},
		'[webhook] trial_will_end (notify subscriber)'
	);
}
