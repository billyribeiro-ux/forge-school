/**
 * POST /checkout/[product]
 *
 * Initiates a Stripe Checkout Session for the requested product/price.
 * The POST form on /pricing hits this endpoint with a priceId hidden
 * field; we validate, persist an `orders` row with status='open', and
 * redirect to Stripe's hosted Checkout.
 *
 * The ENTITLEMENT grant happens in the webhook receiver — not here.
 * This endpoint only opens the payment intent.
 */
import { error, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { PUBLIC_APP_URL } from '$env/static/public';
import { db } from '$lib/server/db';
import { orders, prices, products } from '$lib/server/db/schema';
import { ensureSessionCookie } from '$lib/server/session';
import { stripe } from '$lib/server/stripe/client';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, cookies }) => {
	const form = await request.formData();
	const priceId = form.get('priceId');
	if (typeof priceId !== 'string' || priceId === '') {
		error(400, { message: 'Missing priceId', errorId: 'checkout-missing-price' });
	}

	const productSlug = params.product;

	// Validate product + price in one query
	const [match] = await db
		.select({ product: products, price: prices })
		.from(products)
		.innerJoin(prices, eq(prices.productId, products.id))
		.where(
			and(
				eq(products.slug, productSlug),
				eq(products.status, 'active'),
				eq(prices.id, priceId),
				eq(prices.active, true)
			)
		)
		.limit(1);

	if (match === undefined) {
		error(404, {
			message: `Unknown product "${productSlug}" or price not available`,
			errorId: `checkout-not-found-${productSlug}`
		});
	}

	const sessionId = ensureSessionCookie(cookies);

	// Create an open order that the webhook will update on completion.
	const [order] = await db
		.insert(orders)
		.values({
			sessionId,
			status: 'open',
			currency: match.price.currency,
			subtotalCents: match.price.unitAmountCents,
			discountCents: 0,
			totalCents: match.price.unitAmountCents
		})
		.returning();
	if (order === undefined) {
		error(500, { message: 'Failed to create order', errorId: `checkout-insert-failed` });
	}

	const mode: 'payment' | 'subscription' =
		match.price.interval === 'one_time' ? 'payment' : 'subscription';

	const appUrl = PUBLIC_APP_URL;
	const successUrl = `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
	const cancelUrl = `${appUrl}/pricing?cancelled=1`;

	const session = await stripe.checkout.sessions.create({
		mode,
		line_items: [{ price: match.price.stripePriceId, quantity: 1 }],
		success_url: successUrl,
		cancel_url: cancelUrl,
		client_reference_id: order.id,
		metadata: {
			forge_order_id: order.id,
			forge_session_id: sessionId,
			forge_product_slug: productSlug
		},
		...(mode === 'subscription' && match.price.trialPeriodDays !== null
			? {
					subscription_data: {
						trial_period_days: match.price.trialPeriodDays,
						metadata: {
							forge_session_id: sessionId,
							forge_product_slug: productSlug
						}
					}
				}
			: {}),
		allow_promotion_codes: true
	});

	// Stash the Stripe session id on our order so the webhook can match.
	await db
		.update(orders)
		.set({ stripeCheckoutSessionId: session.id, updatedAt: new Date() })
		.where(eq(orders.id, order.id));

	if (session.url === null) {
		error(500, {
			message: 'Stripe did not return a Checkout URL',
			errorId: `checkout-no-url-${order.id}`
		});
	}

	redirect(303, session.url);
};
