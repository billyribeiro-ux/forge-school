/**
 * Adjunct seed: 12 billing personas covering the realistic spread of
 * subscription and purchase states the billing UI needs to render
 * correctly.
 *
 * These are DB-only synthetic rows (synthetic Stripe IDs). They do NOT
 * exist in Stripe's test mode — the billing-portal button on those
 * session cookies would 404. That's OK: personas are for eyeballing UI
 * states during dev, not for exercising Stripe round-trips.
 *
 * Called by seed-dev.ts after the real Stripe product seed.
 */
import { eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../src/lib/server/db/schema.ts';

type DbT = ReturnType<typeof drizzle<typeof schema>>;

type SubscriptionPersona = {
	label: string;
	productSlug: 'forgeschool-pro-monthly' | 'forgeschool-pro-yearly';
	status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'unpaid' | 'paused';
	cancelAtPeriodEnd: boolean;
	periodDaysFromNow: number;
	trialDaysFromNow: number | null;
};

type PurchasePersona = {
	label: string;
	productSlug: 'forgeschool-lifetime';
	status: 'complete';
	daysAgo: number;
	refund: { amountCents: number; reason: string } | null;
};

const subscriptionPersonas: SubscriptionPersona[] = [
	{
		label: 'trialing-fresh',
		productSlug: 'forgeschool-pro-monthly',
		status: 'trialing',
		cancelAtPeriodEnd: false,
		periodDaysFromNow: 7,
		trialDaysFromNow: 7
	},
	{
		label: 'trialing-ending-soon',
		productSlug: 'forgeschool-pro-monthly',
		status: 'trialing',
		cancelAtPeriodEnd: false,
		periodDaysFromNow: 2,
		trialDaysFromNow: 2
	},
	{
		label: 'active-monthly',
		productSlug: 'forgeschool-pro-monthly',
		status: 'active',
		cancelAtPeriodEnd: false,
		periodDaysFromNow: 18,
		trialDaysFromNow: null
	},
	{
		label: 'active-yearly',
		productSlug: 'forgeschool-pro-yearly',
		status: 'active',
		cancelAtPeriodEnd: false,
		periodDaysFromNow: 240,
		trialDaysFromNow: null
	},
	{
		label: 'cancel-at-period-end',
		productSlug: 'forgeschool-pro-monthly',
		status: 'active',
		cancelAtPeriodEnd: true,
		periodDaysFromNow: 12,
		trialDaysFromNow: null
	},
	{
		label: 'past-due',
		productSlug: 'forgeschool-pro-monthly',
		status: 'past_due',
		cancelAtPeriodEnd: false,
		periodDaysFromNow: 3,
		trialDaysFromNow: null
	},
	{
		label: 'cancelled-grace',
		productSlug: 'forgeschool-pro-monthly',
		status: 'cancelled',
		cancelAtPeriodEnd: false,
		periodDaysFromNow: 5,
		trialDaysFromNow: null
	},
	{
		label: 'unpaid',
		productSlug: 'forgeschool-pro-monthly',
		status: 'unpaid',
		cancelAtPeriodEnd: false,
		periodDaysFromNow: -2,
		trialDaysFromNow: null
	},
	{
		label: 'paused',
		productSlug: 'forgeschool-pro-yearly',
		status: 'paused',
		cancelAtPeriodEnd: false,
		periodDaysFromNow: 100,
		trialDaysFromNow: null
	}
];

const purchasePersonas: PurchasePersona[] = [
	{
		label: 'lifetime-owner',
		productSlug: 'forgeschool-lifetime',
		status: 'complete',
		daysAgo: 30,
		refund: null
	},
	{
		label: 'lifetime-refunded',
		productSlug: 'forgeschool-lifetime',
		status: 'complete',
		daysAgo: 60,
		refund: { amountCents: 49700, reason: 'requested_by_customer' }
	},
	{
		label: 'lifetime-partial-ref',
		productSlug: 'forgeschool-lifetime',
		status: 'complete',
		daysAgo: 90,
		refund: { amountCents: 10000, reason: 'goodwill' }
	}
];

function daysFromNow(days: number): Date {
	return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export async function seedPersonas(db: DbT): Promise<void> {
	console.log('[seed] personas...');

	// Pre-resolve product + price rows so we can reference them.
	const productRows = await db.select().from(schema.products);
	const priceRows = await db.select().from(schema.prices);
	const productBySlug = new Map(productRows.map((p) => [p.slug, p]));

	for (const persona of subscriptionPersonas) {
		const product = productBySlug.get(persona.productSlug);
		if (product === undefined) continue;
		const price = priceRows.find((p) => p.productId === product.id);
		if (price === undefined) continue;

		const sessionId = `persona-${persona.label}`;
		const stripeSubscriptionId = `sub_test_persona_${persona.label}`;
		const stripeCustomerId = `cus_test_persona_${persona.label}`;

		await db
			.insert(schema.subscriptions)
			.values({
				sessionId,
				stripeSubscriptionId,
				stripeCustomerId,
				priceId: price.id,
				status: persona.status,
				currentPeriodStart: daysFromNow(persona.periodDaysFromNow - 30),
				currentPeriodEnd: daysFromNow(persona.periodDaysFromNow),
				cancelAtPeriodEnd: persona.cancelAtPeriodEnd,
				trialEnd: persona.trialDaysFromNow !== null ? daysFromNow(persona.trialDaysFromNow) : null
			})
			.onConflictDoUpdate({
				target: schema.subscriptions.stripeSubscriptionId,
				set: { status: persona.status, cancelAtPeriodEnd: persona.cancelAtPeriodEnd }
			});

		// Grant entitlement for active-ish states
		if (['trialing', 'active', 'past_due'].includes(persona.status)) {
			await db
				.insert(schema.entitlements)
				.values({
					sessionId,
					productId: product.id,
					source: 'subscription',
					sourceRef: stripeSubscriptionId
				})
				.onConflictDoUpdate({
					target: [
						schema.entitlements.sessionId,
						schema.entitlements.productId,
						schema.entitlements.source
					],
					set: { revokedAt: null }
				});
		}
	}

	for (const persona of purchasePersonas) {
		const product = productBySlug.get(persona.productSlug);
		if (product === undefined) continue;
		const price = priceRows.find((p) => p.productId === product.id);
		if (price === undefined) continue;

		const sessionId = `persona-${persona.label}`;
		const paidAt = daysFromNow(-persona.daysAgo);

		const [order] = await db
			.insert(schema.orders)
			.values({
				sessionId,
				status: 'complete',
				currency: price.currency,
				subtotalCents: price.unitAmountCents,
				totalCents: price.unitAmountCents,
				stripeCheckoutSessionId: `cs_test_persona_${persona.label}`
			})
			.onConflictDoNothing({ target: schema.orders.stripeCheckoutSessionId })
			.returning();

		if (order === undefined) {
			const [existing] = await db
				.select()
				.from(schema.orders)
				.where(eq(schema.orders.stripeCheckoutSessionId, `cs_test_persona_${persona.label}`));
			if (existing !== undefined) {
				continue;
			}
			continue;
		}

		const [payment] = await db
			.insert(schema.payments)
			.values({
				orderId: order.id,
				stripePaymentIntentId: `pi_test_persona_${persona.label}`,
				status: persona.refund !== null ? 'refunded' : 'paid',
				amountCents: price.unitAmountCents,
				currency: price.currency,
				paidAt
			})
			.onConflictDoNothing({ target: schema.payments.stripePaymentIntentId })
			.returning();

		if (payment !== undefined && persona.refund !== null) {
			await db
				.insert(schema.refunds)
				.values({
					paymentId: payment.id,
					stripeRefundId: `re_test_persona_${persona.label}`,
					status: 'succeeded',
					amountCents: persona.refund.amountCents,
					reason: persona.refund.reason
				})
				.onConflictDoNothing({ target: schema.refunds.stripeRefundId });
		}

		// Entitlement: granted for non-refunded OR partially-refunded purchases,
		// revoked for full refunds.
		const isFullRefund =
			persona.refund !== null && persona.refund.amountCents >= price.unitAmountCents;
		await db
			.insert(schema.entitlements)
			.values({
				sessionId,
				productId: product.id,
				source: 'purchase',
				sourceRef: `cs_test_persona_${persona.label}`,
				...(isFullRefund ? { revokedAt: new Date() } : {})
			})
			.onConflictDoUpdate({
				target: [
					schema.entitlements.sessionId,
					schema.entitlements.productId,
					schema.entitlements.source
				],
				set: { revokedAt: isFullRefund ? new Date() : null }
			});
	}

	console.log(
		`[seed]   ✓ ${subscriptionPersonas.length + purchasePersonas.length} personas (${subscriptionPersonas.length} subscriptions + ${purchasePersonas.length} purchases)`
	);
}
