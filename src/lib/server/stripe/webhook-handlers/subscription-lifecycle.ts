/**
 * Stripe events: `customer.subscription.created` / `.updated` / `.deleted`
 *
 * Three events share most of the logic (map subscription → our
 * `subscriptions` row), differing only in which state transitions
 * they represent. Colocating them keeps the shared upsert code in one
 * place; each event has a thin wrapper that decides the entitlement
 * side-effect.
 */

import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';
import { db } from '$lib/server/db';
import { type NewSubscription, prices, subscriptions } from '$lib/server/db/schema';
import {
	grantSubscriptionEntitlement,
	revokeSubscriptionEntitlement
} from '$lib/server/entitlements';
import { logger } from '$lib/server/logger';

type ResolvedContext = {
	subscription: Stripe.Subscription;
	sessionId: string;
	productSlug: string;
};

function readContext(event: Stripe.Event, expectedType: string): ResolvedContext | null {
	if (event.type !== expectedType) {
		throw new Error(`[webhook] wrong handler for event type ${event.type}`);
	}
	const subscription = event.data.object as Stripe.Subscription;
	const sessionId = subscription.metadata?.['forge_session_id'] ?? null;
	const productSlug = subscription.metadata?.['forge_product_slug'] ?? null;
	if (sessionId === null || productSlug === null) {
		logger.warn(
			{ stripeEventId: event.id, subscriptionId: subscription.id },
			`[webhook] ${expectedType} missing forge_* metadata; ignoring`
		);
		return null;
	}
	return { subscription, sessionId, productSlug };
}

async function upsertSubscription(
	ctx: ResolvedContext
): Promise<{ productId: string | null; subscriptionRowId: string | null }> {
	const { subscription } = ctx;

	const primaryItem = subscription.items.data[0];
	if (primaryItem === undefined) {
		logger.warn(
			{ subscriptionId: subscription.id },
			'[webhook] subscription has no items; skipping'
		);
		return { productId: null, subscriptionRowId: null };
	}

	const [price] = await db
		.select({ id: prices.id, productId: prices.productId })
		.from(prices)
		.where(eq(prices.stripePriceId, primaryItem.price.id))
		.limit(1);
	if (price === undefined) {
		logger.warn(
			{ subscriptionId: subscription.id, stripePriceId: primaryItem.price.id },
			'[webhook] subscription price not in DB; skipping'
		);
		return { productId: null, subscriptionRowId: null };
	}

	const row: NewSubscription = {
		sessionId: ctx.sessionId,
		stripeSubscriptionId: subscription.id,
		stripeCustomerId:
			typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
		priceId: price.id,
		status: subscription.status as
			| 'trialing'
			| 'active'
			| 'past_due'
			| 'cancelled'
			| 'unpaid'
			| 'paused',
		currentPeriodStart: new Date(primaryItem.current_period_start * 1000),
		currentPeriodEnd: new Date(primaryItem.current_period_end * 1000),
		cancelAtPeriodEnd: subscription.cancel_at_period_end,
		trialEnd: subscription.trial_end !== null ? new Date(subscription.trial_end * 1000) : null
	};

	const [upserted] = await db
		.insert(subscriptions)
		.values(row)
		.onConflictDoUpdate({
			target: subscriptions.stripeSubscriptionId,
			set: {
				status: row.status,
				currentPeriodStart: row.currentPeriodStart,
				currentPeriodEnd: row.currentPeriodEnd,
				cancelAtPeriodEnd: row.cancelAtPeriodEnd,
				trialEnd: row.trialEnd,
				updatedAt: new Date()
			}
		})
		.returning({ id: subscriptions.id });

	return { productId: price.productId, subscriptionRowId: upserted?.id ?? null };
}

export async function handleSubscriptionCreated(event: Stripe.Event): Promise<void> {
	const ctx = readContext(event, 'customer.subscription.created');
	if (ctx === null) return;
	const { productId } = await upsertSubscription(ctx);
	if (productId === null) return;
	await grantSubscriptionEntitlement(db, {
		sessionId: ctx.sessionId,
		productId,
		subscriptionId: ctx.subscription.id
	});
	logger.info(
		{
			stripeEventId: event.id,
			subscriptionId: ctx.subscription.id,
			status: ctx.subscription.status
		},
		'[webhook] subscription created + entitlement granted'
	);
}

export async function handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
	const ctx = readContext(event, 'customer.subscription.updated');
	if (ctx === null) return;
	const { productId } = await upsertSubscription(ctx);
	if (productId === null) return;

	const status = ctx.subscription.status;
	// Active-ish states keep the entitlement; terminal states revoke it.
	if (status === 'active' || status === 'trialing' || status === 'past_due') {
		await grantSubscriptionEntitlement(db, {
			sessionId: ctx.sessionId,
			productId,
			subscriptionId: ctx.subscription.id
		});
	} else if (status === 'canceled' || status === 'unpaid' || status === 'incomplete_expired') {
		await revokeSubscriptionEntitlement(db, { sessionId: ctx.sessionId, productId });
	}

	logger.info(
		{ stripeEventId: event.id, subscriptionId: ctx.subscription.id, status },
		'[webhook] subscription updated'
	);
}

export async function handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
	const ctx = readContext(event, 'customer.subscription.deleted');
	if (ctx === null) return;
	const { productId } = await upsertSubscription(ctx);
	if (productId === null) return;
	await revokeSubscriptionEntitlement(db, { sessionId: ctx.sessionId, productId });
	logger.info(
		{ stripeEventId: event.id, subscriptionId: ctx.subscription.id },
		'[webhook] subscription deleted + entitlement revoked'
	);
}
