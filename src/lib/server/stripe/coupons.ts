/**
 * Lazy-mirror DB coupons into Stripe.
 *
 * The DB is the source of truth for which coupon codes exist and
 * their terms. Stripe only needs to know about a coupon the moment
 * we hand off a cart that uses it. `ensureStripeCoupon` creates the
 * Stripe mirror on first use and caches the resulting id on our row
 * so subsequent checkouts reuse it.
 *
 * Server-only. Imports `stripe`, so never reach this from client code.
 */
import { eq } from 'drizzle-orm';
import type { Db } from '$lib/server/db';
import { type Coupon, coupons } from '$lib/server/db/schema';
import { stripe } from './client';

export async function ensureStripeCoupon(db: Db, coupon: Coupon): Promise<string> {
	if (coupon.stripeCouponId !== null) return coupon.stripeCouponId;

	const params =
		coupon.discountType === 'percent'
			? { percent_off: coupon.discountValue }
			: { amount_off: coupon.discountValue, currency: 'usd' };

	const stripeCoupon = await stripe.coupons.create({
		name: coupon.code,
		duration: coupon.duration,
		...(coupon.durationInMonths !== null && { duration_in_months: coupon.durationInMonths }),
		...(coupon.maxRedemptions !== null && { max_redemptions: coupon.maxRedemptions }),
		metadata: { forge_coupon_id: coupon.id, forge_coupon_code: coupon.code },
		...params
	});

	await db
		.update(coupons)
		.set({ stripeCouponId: stripeCoupon.id, updatedAt: new Date() })
		.where(eq(coupons.id, coupon.id));

	return stripeCoupon.id;
}
