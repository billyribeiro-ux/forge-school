/**
 * Stripe event: `checkout.session.completed`
 *
 * Fires when Stripe's hosted Checkout flow completes successfully.
 * Lesson 048 ships the skeleton (idempotent, logs); lesson 049 adds
 * the order + entitlement grant logic that the architecture promises.
 */
import type Stripe from 'stripe';
import { logger } from '$lib/server/logger';

export async function handleCheckoutSessionCompleted(event: Stripe.Event): Promise<void> {
	if (event.type !== 'checkout.session.completed') {
		throw new Error(`[webhook] wrong handler for event type ${event.type}`);
	}
	const session = event.data.object;

	logger.info(
		{
			stripeEventId: event.id,
			sessionId: session.id,
			mode: session.mode,
			paymentStatus: session.payment_status,
			customerEmail: session.customer_details?.email ?? null,
			forgeOrderId: session.metadata?.['forge_order_id'] ?? null,
			forgeSessionId: session.metadata?.['forge_session_id'] ?? null
		},
		'[webhook] checkout.session.completed received (lesson 049 adds grant)'
	);
}
