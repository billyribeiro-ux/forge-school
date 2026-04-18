/**
 * Admin layout gate.
 *
 * Two guards: dev env ONLY + explicit feature flag. Both must pass or
 * the route is 404 — not 401, not 403, 404. A user visiting /admin in
 * production gets a cold route-not-found response, leaking nothing
 * about the existence of an admin surface.
 *
 * When auth lands, this gate flips to a role check on the authenticated
 * user. For v1 there's no auth, so the flag IS the gate.
 */
import { error } from '@sveltejs/kit';
import { count } from 'drizzle-orm';
import { dev } from '$app/environment';
import { ENABLE_ADMIN_SHELL } from '$env/static/private';
import { db } from '$lib/server/db';
import { coupons, orders, products, subscriptions } from '$lib/server/db/schema';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	if (!dev) {
		error(404, { message: 'Not found', errorId: 'admin-not-in-prod' });
	}
	if (ENABLE_ADMIN_SHELL !== 'true') {
		error(404, { message: 'Not found', errorId: 'admin-flag-off' });
	}

	const [[productCount], [couponCount], [orderCount], [subscriptionCount]] = await Promise.all([
		db.select({ n: count() }).from(products),
		db.select({ n: count() }).from(coupons),
		db.select({ n: count() }).from(orders),
		db.select({ n: count() }).from(subscriptions)
	]);

	return {
		counts: {
			products: productCount?.n ?? 0,
			coupons: couponCount?.n ?? 0,
			orders: orderCount?.n ?? 0,
			subscriptions: subscriptionCount?.n ?? 0
		}
	};
};
