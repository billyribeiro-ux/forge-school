import { describe, it, expect } from 'vitest';
import { computeCouponDiscount, failureMessage } from '../../src/lib/cart/coupons.ts';
import type { Coupon } from '../../src/lib/server/db/schema.ts';

function makeCoupon(over: Partial<Coupon> = {}): Coupon {
	const now = new Date();
	return {
		id: 'c1',
		code: 'TEST',
		stripeCouponId: null,
		discountType: 'percent',
		discountValue: 10,
		duration: 'once',
		durationInMonths: null,
		maxRedemptions: null,
		redemptionsCount: 0,
		validFrom: null,
		validUntil: null,
		active: true,
		createdAt: now,
		updatedAt: now,
		...over
	};
}

describe('coupons.computeCouponDiscount', () => {
	it('applies a percent discount and floors to cents', () => {
		const result = computeCouponDiscount(
			makeCoupon({ discountType: 'percent', discountValue: 10 }),
			4970
		);
		if (!result.ok) throw new Error('expected ok');
		// 10% of 4970 = 497
		expect(result.discountCents).toBe(497);
	});

	it('clamps a percent discount at 100% to the subtotal', () => {
		const result = computeCouponDiscount(
			makeCoupon({ discountType: 'percent', discountValue: 100 }),
			5000
		);
		if (!result.ok) throw new Error('expected ok');
		expect(result.discountCents).toBe(5000);
	});

	it('clamps an amount discount at the subtotal', () => {
		const result = computeCouponDiscount(
			makeCoupon({ discountType: 'amount', discountValue: 10000 }),
			5000
		);
		if (!result.ok) throw new Error('expected ok');
		expect(result.discountCents).toBe(5000);
	});

	it('rejects an inactive coupon', () => {
		const result = computeCouponDiscount(makeCoupon({ active: false }), 5000);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toBe('inactive');
	});

	it('rejects a future-start coupon', () => {
		const future = new Date(Date.now() + 1000 * 60 * 60 * 24);
		const result = computeCouponDiscount(makeCoupon({ validFrom: future }), 5000);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toBe('not_yet_valid');
	});

	it('rejects an expired coupon', () => {
		const past = new Date(Date.now() - 1000 * 60 * 60 * 24);
		const result = computeCouponDiscount(makeCoupon({ validUntil: past }), 5000);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toBe('expired');
	});

	it('rejects a max-redemptions-reached coupon', () => {
		const result = computeCouponDiscount(
			makeCoupon({ maxRedemptions: 10, redemptionsCount: 10 }),
			5000
		);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toBe('max_redemptions_reached');
	});

	it('rejects when subtotal is zero', () => {
		const result = computeCouponDiscount(makeCoupon(), 0);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toBe('subtotal_zero');
	});

	it('accepts when validFrom is in the past and validUntil is in the future', () => {
		const past = new Date(Date.now() - 1000);
		const future = new Date(Date.now() + 1000 * 60 * 60 * 24);
		const result = computeCouponDiscount(
			makeCoupon({ validFrom: past, validUntil: future }),
			5000
		);
		expect(result.ok).toBe(true);
	});
});

describe('coupons.failureMessage', () => {
	it('maps every failure reason to a non-empty string', () => {
		const reasons = [
			'inactive',
			'not_yet_valid',
			'expired',
			'max_redemptions_reached',
			'subtotal_zero'
		] as const;
		for (const r of reasons) {
			expect(failureMessage(r)).toMatch(/\w/);
		}
	});
});
