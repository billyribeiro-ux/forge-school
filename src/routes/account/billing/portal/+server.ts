/**
 * POST /account/billing/portal
 *
 * Creates a Stripe Billing Portal session and redirects the user there.
 * The portal is Stripe's hosted self-service UI — update card, change
 * plan, cancel subscription, view invoices — all with zero custom UI.
 *
 * We look up the customer id from our `subscriptions` table; a session
 * without a prior subscription has no portal (no customer ID to pass).
 */
import { error, redirect } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { PUBLIC_APP_URL } from '$env/static/public';
import { db } from '$lib/server/db';
import { subscriptions } from '$lib/server/db/schema';
import { ensureSessionCookie } from '$lib/server/session';
import { stripe } from '$lib/server/stripe/client';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	const sessionId = ensureSessionCookie(cookies);

	const [primary] = await db
		.select({ customerId: subscriptions.stripeCustomerId })
		.from(subscriptions)
		.where(eq(subscriptions.sessionId, sessionId))
		.orderBy(desc(subscriptions.createdAt))
		.limit(1);

	if (primary === undefined) {
		error(404, {
			message: 'No subscription on this session',
			errorId: `billing-portal-no-subscription-${sessionId}`
		});
	}

	const portal = await stripe.billingPortal.sessions.create({
		customer: primary.customerId,
		return_url: `${PUBLIC_APP_URL}/account/billing`
	});

	redirect(303, portal.url);
};
