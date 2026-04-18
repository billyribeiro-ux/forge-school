/**
 * Pure coupon application logic.
 *
 * Zero Drizzle, zero Stripe, zero Svelte. The caller resolves a code
 * into a Coupon row (DB-loaded) and passes it here along with the
 * cart's subtotal. The function returns a discriminated union:
 * `{ ok: true, discountCents, coupon }` on success; `{ ok: false,
 * reason }` otherwise. Makes unit-testing (lesson 088) trivial.
 *
 * Money is always integer cents. Percent discounts round DOWN so the
 * house never gives away a fractional cent.
 */
import type { Coupon } from '$lib/server/db/schema';

export type ApplyCouponResult =
	| { ok: true; discountCents: number; coupon: Coupon }
	| { ok: false; reason: ApplyCouponFailure };

export type ApplyCouponFailure =
	| 'inactive'
	| 'not_yet_valid'
	| 'expired'
	| 'max_redemptions_reached'
	| 'subtotal_zero';

export function computeCouponDiscount(
	coupon: Coupon,
	subtotalCents: number,
	now: Date = new Date()
): ApplyCouponResult {
	if (!coupon.active) return { ok: false, reason: 'inactive' };
	if (coupon.validFrom !== null && coupon.validFrom.getTime() > now.getTime()) {
		return { ok: false, reason: 'not_yet_valid' };
	}
	if (coupon.validUntil !== null && coupon.validUntil.getTime() <= now.getTime()) {
		return { ok: false, reason: 'expired' };
	}
	if (coupon.maxRedemptions !== null && coupon.redemptionsCount >= coupon.maxRedemptions) {
		return { ok: false, reason: 'max_redemptions_reached' };
	}
	if (subtotalCents <= 0) return { ok: false, reason: 'subtotal_zero' };

	const raw =
		coupon.discountType === 'percent'
			? Math.floor((subtotalCents * coupon.discountValue) / 100)
			: coupon.discountValue;

	const clamped = Math.min(raw, subtotalCents);
	return { ok: true, discountCents: clamped, coupon };
}

export function failureMessage(reason: ApplyCouponFailure): string {
	switch (reason) {
		case 'inactive':
			return 'This coupon is no longer active.';
		case 'not_yet_valid':
			return 'This coupon is not yet valid.';
		case 'expired':
			return 'This coupon has expired.';
		case 'max_redemptions_reached':
			return 'This coupon has reached its redemption limit.';
		case 'subtotal_zero':
			return 'Add an item to your cart before applying a coupon.';
	}
}
