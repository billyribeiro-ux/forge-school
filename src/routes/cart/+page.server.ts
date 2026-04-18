import { type Actions, fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { subtotalCents } from '$lib/cart/cart-math';
import { CART_COOKIE_NAME, deserializeCart } from '$lib/cart/cart-persistence';
import { computeCouponDiscount, failureMessage } from '$lib/cart/coupons';
import { db } from '$lib/server/db';
import { coupons } from '$lib/server/db/schema';

const COUPON_COOKIE_NAME = 'forge_coupon';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export const load = async ({ cookies }) => {
	const code = cookies.get(COUPON_COOKIE_NAME);
	if (code === undefined || code === '') return { appliedCoupon: null };

	const [coupon] = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
	if (coupon === undefined) {
		cookies.delete(COUPON_COOKIE_NAME, { path: '/' });
		return { appliedCoupon: null };
	}

	const cartItems = deserializeCart(cookies.get(CART_COOKIE_NAME));
	const result = computeCouponDiscount(coupon, subtotalCents(cartItems));
	if (!result.ok) {
		return { appliedCoupon: null, couponError: failureMessage(result.reason) };
	}

	return {
		appliedCoupon: {
			code: coupon.code,
			discountCents: result.discountCents,
			discountType: coupon.discountType,
			discountValue: coupon.discountValue
		}
	};
};

export const actions: Actions = {
	apply: async ({ request, cookies }) => {
		const form = await request.formData();
		const codeRaw = form.get('code');
		if (typeof codeRaw !== 'string') {
			return fail(400, { couponError: 'Missing code', code: '' });
		}
		const code = codeRaw.trim().toUpperCase();
		if (code === '') {
			return fail(400, { couponError: 'Enter a coupon code', code: '' });
		}

		const [coupon] = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
		if (coupon === undefined) {
			return fail(404, { couponError: 'Unknown coupon code', code });
		}

		const cartItems = deserializeCart(cookies.get(CART_COOKIE_NAME));
		const result = computeCouponDiscount(coupon, subtotalCents(cartItems));
		if (!result.ok) {
			return fail(400, { couponError: failureMessage(result.reason), code });
		}

		cookies.set(COUPON_COOKIE_NAME, coupon.code, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: true,
			maxAge: COOKIE_MAX_AGE_SECONDS
		});
		return { applied: true, code: coupon.code };
	},
	remove: async ({ cookies }) => {
		cookies.delete(COUPON_COOKIE_NAME, { path: '/' });
		return { removed: true };
	}
};
