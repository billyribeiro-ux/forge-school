/**
 * Stripe events: `invoice.paid`, `invoice.payment_failed`,
 * `invoice.payment_action_required`
 *
 * Invoices fire on every subscription renewal. Our concern in v1 is
 * narrow:
 *  - invoice.paid — log (subscription.updated tracks state).
 *  - invoice.payment_failed — log with enough context for grace-period
 *    handling. The eventual entitlement revoke happens via
 *    subscription.updated when status flips to unpaid/canceled.
 *  - invoice.payment_action_required — log; future email via Resend.
 */
import type Stripe from 'stripe';
import { logger } from '$lib/server/logger';

function logInvoice(event: Stripe.Event, msg: string): void {
	const invoice = event.data.object as Stripe.Invoice;
	// Stripe 2025+ moved subscription reference off the root invoice.
	// It now lives on the invoice's parent.subscription_details field
	// (for subscription invoices). We log both shapes defensively.
	const rawRoot = invoice as unknown as { subscription?: string | null };
	const parentDetails = invoice.parent as
		| { subscription_details?: { subscription?: string | null } | null }
		| null
		| undefined;
	const subscriptionId =
		rawRoot.subscription ?? parentDetails?.subscription_details?.subscription ?? null;

	logger.info(
		{
			stripeEventId: event.id,
			invoiceId: invoice.id,
			subscriptionId,
			amountDue: invoice.amount_due,
			amountPaid: invoice.amount_paid,
			status: invoice.status,
			hostedInvoiceUrl: invoice.hosted_invoice_url
		},
		msg
	);
}

export async function handleInvoicePaid(event: Stripe.Event): Promise<void> {
	if (event.type !== 'invoice.paid') {
		throw new Error(`[webhook] wrong handler for event type ${event.type}`);
	}
	logInvoice(event, '[webhook] invoice.paid');
}

export async function handleInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
	if (event.type !== 'invoice.payment_failed') {
		throw new Error(`[webhook] wrong handler for event type ${event.type}`);
	}
	logInvoice(
		event,
		'[webhook] invoice.payment_failed (grace period; revoke via subscription.updated)'
	);
}

export async function handleInvoicePaymentActionRequired(event: Stripe.Event): Promise<void> {
	if (event.type !== 'invoice.payment_action_required') {
		throw new Error(`[webhook] wrong handler for event type ${event.type}`);
	}
	logInvoice(event, '[webhook] invoice.payment_action_required (notify subscriber)');
}
