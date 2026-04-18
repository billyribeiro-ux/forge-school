/**
 * Stripe events: `charge.refunded`, `charge.dispute.created`
 *
 * charge.refunded — full or partial refund of a one-time payment.
 * We persist a `refunds` row, flip the payment's status, and revoke
 * entitlements granted from the associated purchase.
 *
 * charge.dispute.created — a chargeback opened. For v1 we log; the
 * actual dispute lifecycle (`dispute.funds_withdrawn`,
 * `dispute.closed`) is covered when Billy's support team starts
 * handling disputes. For now the operational signal is a log line.
 */
import type Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { orders, payments, refunds } from '$lib/server/db/schema';
import { revokePurchaseEntitlementsForSession } from '$lib/server/entitlements';
import { logger } from '$lib/server/logger';

export async function handleChargeRefunded(event: Stripe.Event): Promise<void> {
	if (event.type !== 'charge.refunded') {
		throw new Error(`[webhook] wrong handler for event type ${event.type}`);
	}
	const charge = event.data.object;
	const paymentIntentId =
		typeof charge.payment_intent === 'string'
			? charge.payment_intent
			: (charge.payment_intent?.id ?? null);

	if (paymentIntentId === null) {
		logger.warn(
			{ stripeEventId: event.id, chargeId: charge.id },
			'[webhook] charge.refunded without payment_intent; ignoring'
		);
		return;
	}

	const [payment] = await db
		.select()
		.from(payments)
		.where(eq(payments.stripePaymentIntentId, paymentIntentId))
		.limit(1);

	if (payment === undefined) {
		logger.warn(
			{ stripeEventId: event.id, paymentIntentId },
			'[webhook] charge.refunded: no payment row for intent'
		);
		return;
	}

	// Persist every Stripe refund on this charge that we haven't seen before.
	const refundList = charge.refunds?.data ?? [];
	for (const stripeRefund of refundList) {
		await db
			.insert(refunds)
			.values({
				paymentId: payment.id,
				stripeRefundId: stripeRefund.id,
				status: stripeRefund.status ?? 'unknown',
				amountCents: stripeRefund.amount,
				reason: stripeRefund.reason ?? null
			})
			.onConflictDoNothing({ target: refunds.stripeRefundId });
	}

	// Mark the payment as refunded; the client uses this to surface state.
	await db
		.update(payments)
		.set({
			status: charge.amount_refunded >= charge.amount ? 'refunded' : 'partially_refunded'
		})
		.where(eq(payments.id, payment.id));

	// Full refund revokes the purchase entitlement. Partial refunds leave
	// the entitlement granted — customer still has access to the product,
	// they just got some money back.
	if (charge.amount_refunded >= charge.amount) {
		const [order] = await db.select().from(orders).where(eq(orders.id, payment.orderId)).limit(1);
		if (order !== undefined) {
			await revokePurchaseEntitlementsForSession(db, { sessionId: order.sessionId });
			logger.info(
				{ stripeEventId: event.id, paymentId: payment.id, orderId: order.id },
				'[webhook] charge.refunded (full) — purchase entitlements revoked'
			);
		}
	} else {
		logger.info(
			{
				stripeEventId: event.id,
				paymentId: payment.id,
				amountRefunded: charge.amount_refunded,
				amountCharge: charge.amount
			},
			'[webhook] charge.refunded (partial)'
		);
	}
}

export async function handleChargeDisputeCreated(event: Stripe.Event): Promise<void> {
	if (event.type !== 'charge.dispute.created') {
		throw new Error(`[webhook] wrong handler for event type ${event.type}`);
	}
	const dispute = event.data.object;
	logger.warn(
		{
			stripeEventId: event.id,
			disputeId: dispute.id,
			chargeId: dispute.charge,
			amount: dispute.amount,
			reason: dispute.reason,
			status: dispute.status
		},
		'[webhook] charge.dispute.created (operator review; no automatic revoke yet)'
	);
}
