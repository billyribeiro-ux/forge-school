/**
 * POST /cart/checkout
 *
 * Converts the client-side cart cookie into a Stripe Checkout Session.
 *
 * Flow:
 *   1. Parse the `forge_cart` cookie, enforce a non-empty list.
 *   2. Re-validate every line item against the DB — price must exist,
 *      be active, and belong to an active product. Any drift (deleted
 *      price, inactive product, tampered cookie) aborts the request.
 *   3. Assert a single Stripe mode — Stripe rejects sessions that
 *      mix subscriptions and one-time payments in the same line_items.
 *   4. Insert one `orders` row + one `orderItems` row per line.
 *   5. Create the Checkout Session with every resolved Stripe price id.
 *   6. Stash the Stripe session id on the order for the webhook to
 *      match, and redirect the browser to the hosted Checkout URL.
 *
 * ENTITLEMENT is still granted by the webhook — not here.
 */
import { error, redirect } from '@sveltejs/kit';
import { and, eq, inArray } from 'drizzle-orm';
import { PUBLIC_APP_URL } from '$env/static/public';
import { CART_COOKIE_NAME, deserializeCart } from '$lib/cart/cart-persistence';
import { computeCouponDiscount } from '$lib/cart/coupons';
import { db } from '$lib/server/db';
import {
	couponRedemptions,
	coupons,
	orderItems,
	orders,
	prices,
	products
} from '$lib/server/db/schema';
import { ensureSessionCookie } from '$lib/server/session';
import { stripe } from '$lib/server/stripe/client';
import { ensureStripeCoupon } from '$lib/server/stripe/coupons';
import type { RequestHandler } from './$types';

const COUPON_COOKIE_NAME = 'forge_coupon';

export const POST: RequestHandler = async ({ cookies }) => {
	const raw = cookies.get(CART_COOKIE_NAME);
	const items = deserializeCart(raw);

	if (items.length === 0) {
		error(400, { message: 'Cart is empty', errorId: 'cart-checkout-empty' });
	}

	const priceIds = [...new Set(items.map((i) => i.priceId))];
	const priceRows = await db
		.select({ price: prices, product: products })
		.from(prices)
		.innerJoin(products, eq(prices.productId, products.id))
		.where(
			and(inArray(prices.id, priceIds), eq(prices.active, true), eq(products.status, 'active'))
		);

	const priceById = new Map(priceRows.map((r) => [r.price.id, r]));
	if (priceById.size !== priceIds.length) {
		error(400, {
			message: 'One or more cart items are no longer available',
			errorId: 'cart-checkout-stale-items'
		});
	}

	// Stripe can't mix subscription + one-time in one session.
	const firstInterval = priceById.get(items[0]!.priceId)!.price.interval;
	const mode: 'payment' | 'subscription' =
		firstInterval === null || firstInterval === 'one_time' ? 'payment' : 'subscription';

	for (const item of items) {
		const row = priceById.get(item.priceId)!;
		const thisMode: 'payment' | 'subscription' =
			row.price.interval === null || row.price.interval === 'one_time' ? 'payment' : 'subscription';
		if (thisMode !== mode) {
			error(400, {
				message:
					'Cart mixes subscription and one-time products. Check out subscriptions separately.',
				errorId: 'cart-checkout-mixed-modes'
			});
		}
	}

	const currency = priceById.get(items[0]!.priceId)!.price.currency;
	for (const item of items) {
		const row = priceById.get(item.priceId)!;
		if (row.price.currency !== currency) {
			error(400, {
				message: 'Cart mixes currencies. Use a single currency per checkout.',
				errorId: 'cart-checkout-mixed-currencies'
			});
		}
	}

	const subtotalCents = items.reduce((sum, it) => {
		const row = priceById.get(it.priceId)!;
		return sum + row.price.unitAmountCents * it.quantity;
	}, 0);

	const sessionId = ensureSessionCookie(cookies);

	// Resolve applied coupon (from cookie), re-validate against current subtotal.
	const couponCode = cookies.get(COUPON_COOKIE_NAME);
	let appliedCoupon: { id: string; stripeCouponId: string; discountCents: number } | null = null;
	if (couponCode !== undefined && couponCode !== '') {
		const [couponRow] = await db
			.select()
			.from(coupons)
			.where(eq(coupons.code, couponCode))
			.limit(1);
		if (couponRow !== undefined) {
			const result = computeCouponDiscount(couponRow, subtotalCents);
			if (result.ok) {
				const stripeCouponId = await ensureStripeCoupon(db, couponRow);
				appliedCoupon = {
					id: couponRow.id,
					stripeCouponId,
					discountCents: result.discountCents
				};
			}
		}
	}

	const discountCents = appliedCoupon?.discountCents ?? 0;
	const totalCents = Math.max(0, subtotalCents - discountCents);

	const [order] = await db
		.insert(orders)
		.values({
			sessionId,
			status: 'open',
			currency,
			subtotalCents,
			discountCents,
			totalCents,
			...(appliedCoupon !== null && { couponId: appliedCoupon.id })
		})
		.returning();
	if (order === undefined) {
		error(500, { message: 'Failed to create order', errorId: 'cart-checkout-insert-failed' });
	}

	if (appliedCoupon !== null) {
		await db.insert(couponRedemptions).values({
			couponId: appliedCoupon.id,
			orderId: order.id,
			sessionId
		});
	}

	await db.insert(orderItems).values(
		items.map((it) => {
			const row = priceById.get(it.priceId)!;
			return {
				orderId: order.id,
				priceId: it.priceId,
				quantity: it.quantity,
				unitAmountCents: row.price.unitAmountCents
			};
		})
	);

	const appUrl = PUBLIC_APP_URL;
	const successUrl = `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
	const cancelUrl = `${appUrl}/cart?cancelled=1`;

	const lineItems = items.map((it) => {
		const row = priceById.get(it.priceId)!;
		return { price: row.price.stripePriceId, quantity: it.quantity };
	});

	const baseMetadata = {
		forge_order_id: order.id,
		forge_session_id: sessionId,
		forge_cart_checkout: '1'
	};

	const trialDays =
		mode === 'subscription' ? priceById.get(items[0]!.priceId)!.price.trialPeriodDays : null;

	// Stripe forbids combining `allow_promotion_codes` with `discounts`.
	// If the user already applied one of our DB coupons we pass it via
	// `discounts`; otherwise we leave promotion codes open on Stripe's page.
	const session = await stripe.checkout.sessions.create({
		mode,
		line_items: lineItems,
		success_url: successUrl,
		cancel_url: cancelUrl,
		client_reference_id: order.id,
		metadata: baseMetadata,
		...(appliedCoupon !== null
			? { discounts: [{ coupon: appliedCoupon.stripeCouponId }] }
			: { allow_promotion_codes: true }),
		...(mode === 'subscription'
			? {
					subscription_data: {
						metadata: {
							forge_session_id: sessionId,
							forge_cart_checkout: '1'
						},
						...(trialDays !== null && { trial_period_days: trialDays })
					}
				}
			: {})
	});

	await db
		.update(orders)
		.set({ stripeCheckoutSessionId: session.id, updatedAt: new Date() })
		.where(eq(orders.id, order.id));

	if (session.url === null) {
		error(500, {
			message: 'Stripe did not return a Checkout URL',
			errorId: `cart-checkout-no-url-${order.id}`
		});
	}

	redirect(303, session.url);
};
