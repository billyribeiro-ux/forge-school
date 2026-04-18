/**
 * Stripe event: `checkout.session.completed`
 *
 * Fires when Stripe's hosted Checkout flow completes successfully.
 *
 * Contract:
 *  - Payment mode (one-time): mark the `orders` row complete, insert
 *    a `payments` row, grant an `entitlements` row for the product.
 *  - Subscription mode: mark the `orders` row complete. The related
 *    `subscriptions` row and the entitlement grant arrive via
 *    `customer.subscription.created` (lesson 050).
 *
 * Every DB write is idempotent (onConflictDoNothing / onConflictDoUpdate)
 * so retried deliveries after a partial failure are safe.
 */

import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';
import { db } from '$lib/server/db';
import { orders, payments, products } from '$lib/server/db/schema';
import { grantPurchaseEntitlement } from '$lib/server/entitlements';
import { logger } from '$lib/server/logger';

export async function handleCheckoutSessionCompleted(event: Stripe.Event): Promise<void> {
	if (event.type !== 'checkout.session.completed') {
		throw new Error(`[webhook] wrong handler for event type ${event.type}`);
	}
	const session = event.data.object;

	const forgeOrderId = session.metadata?.['forge_order_id'] ?? null;
	const forgeSessionId = session.metadata?.['forge_session_id'] ?? null;
	const forgeProductSlug = session.metadata?.['forge_product_slug'] ?? null;

	if (forgeOrderId === null || forgeSessionId === null || forgeProductSlug === null) {
		logger.warn(
			{ stripeEventId: event.id, sessionId: session.id },
			'[webhook] checkout.session.completed missing forge_* metadata; ignoring'
		);
		return;
	}

	const [order] = await db.select().from(orders).where(eq(orders.id, forgeOrderId)).limit(1);
	if (order === undefined) {
		logger.warn(
			{ stripeEventId: event.id, forgeOrderId },
			'[webhook] order not found for completed session'
		);
		return;
	}

	await db
		.update(orders)
		.set({
			status: 'complete',
			totalCents: session.amount_total ?? order.totalCents,
			updatedAt: new Date()
		})
		.where(eq(orders.id, order.id));

	if (session.mode === 'payment' && session.payment_status === 'paid') {
		const paymentIntent =
			typeof session.payment_intent === 'string'
				? session.payment_intent
				: (session.payment_intent?.id ?? null);

		if (paymentIntent !== null) {
			await db
				.insert(payments)
				.values({
					orderId: order.id,
					stripePaymentIntentId: paymentIntent,
					status: session.payment_status,
					amountCents: session.amount_total ?? order.totalCents,
					currency: session.currency ?? order.currency,
					paidAt: new Date()
				})
				.onConflictDoNothing({ target: payments.stripePaymentIntentId });
		}

		const [product] = await db
			.select({ id: products.id })
			.from(products)
			.where(eq(products.slug, forgeProductSlug))
			.limit(1);

		if (product !== undefined) {
			await grantPurchaseEntitlement(db, {
				sessionId: forgeSessionId,
				productId: product.id,
				sourceRef: session.id
			});

			logger.info(
				{
					stripeEventId: event.id,
					orderId: order.id,
					productSlug: forgeProductSlug,
					sessionPrincipal: forgeSessionId
				},
				'[webhook] purchase entitlement granted'
			);
		} else {
			logger.warn(
				{ stripeEventId: event.id, forgeProductSlug },
				'[webhook] product not found for completed session'
			);
		}
	} else if (session.mode === 'subscription') {
		logger.info(
			{
				stripeEventId: event.id,
				orderId: order.id,
				subscriptionId:
					typeof session.subscription === 'string'
						? session.subscription
						: (session.subscription?.id ?? null)
			},
			'[webhook] subscription checkout complete; entitlement arrives via customer.subscription.created'
		);
	}
}
