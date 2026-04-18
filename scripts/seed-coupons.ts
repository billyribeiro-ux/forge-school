/**
 * Adjunct seed: 12 coupons covering the Stripe discount matrix —
 * percent / amount × once / repeating / forever × active / expired /
 * max-redemptions / future-start / inactive.
 *
 * DB-only synthetic coupons (no Stripe API calls). The coupon module's
 * Stripe mirror lands when the cart-coupon flow ships in Module 5.
 */
import type { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../src/lib/server/db/schema.ts';

type DbT = ReturnType<typeof drizzle<typeof schema>>;

type CouponSpec = {
	label: string;
	code: string;
	discountType: 'percent' | 'amount';
	discountValue: number;
	duration: 'once' | 'repeating' | 'forever';
	durationInMonths: number | null;
	maxRedemptions: number | null;
	redemptionsCount: number;
	validFrom: Date | null;
	validUntil: Date | null;
	active: boolean;
};

function daysFromNow(days: number): Date {
	return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

const coupons: CouponSpec[] = [
	{
		label: 'percent-once-10',
		code: 'WELCOME10',
		discountType: 'percent',
		discountValue: 10,
		duration: 'once',
		durationInMonths: null,
		maxRedemptions: null,
		redemptionsCount: 0,
		validFrom: null,
		validUntil: null,
		active: true
	},
	{
		label: 'percent-repeat-25',
		code: 'QUARTERLY25',
		discountType: 'percent',
		discountValue: 25,
		duration: 'repeating',
		durationInMonths: 3,
		maxRedemptions: null,
		redemptionsCount: 0,
		validFrom: null,
		validUntil: null,
		active: true
	},
	{
		label: 'percent-forever-50',
		code: 'INSIDER50',
		discountType: 'percent',
		discountValue: 50,
		duration: 'forever',
		durationInMonths: null,
		maxRedemptions: 100,
		redemptionsCount: 12,
		validFrom: null,
		validUntil: null,
		active: true
	},
	{
		label: 'percent-once-100',
		code: 'FIRSTFREE',
		discountType: 'percent',
		discountValue: 100,
		duration: 'once',
		durationInMonths: null,
		maxRedemptions: 50,
		redemptionsCount: 3,
		validFrom: null,
		validUntil: null,
		active: true
	},
	{
		label: 'amount-once-5',
		code: 'SAVE5',
		discountType: 'amount',
		discountValue: 500,
		duration: 'once',
		durationInMonths: null,
		maxRedemptions: null,
		redemptionsCount: 0,
		validFrom: null,
		validUntil: null,
		active: true
	},
	{
		label: 'amount-once-25',
		code: 'SAVE25',
		discountType: 'amount',
		discountValue: 2500,
		duration: 'once',
		durationInMonths: null,
		maxRedemptions: null,
		redemptionsCount: 0,
		validFrom: null,
		validUntil: null,
		active: true
	},
	{
		label: 'amount-once-100',
		code: 'BIG100',
		discountType: 'amount',
		discountValue: 10000,
		duration: 'once',
		durationInMonths: null,
		maxRedemptions: 10,
		redemptionsCount: 0,
		validFrom: null,
		validUntil: null,
		active: true
	},
	{
		label: 'amount-repeat-10',
		code: 'MONTHLY10OFF',
		discountType: 'amount',
		discountValue: 1000,
		duration: 'repeating',
		durationInMonths: 6,
		maxRedemptions: null,
		redemptionsCount: 0,
		validFrom: null,
		validUntil: null,
		active: true
	},
	{
		label: 'expired',
		code: 'EXPIRED',
		discountType: 'percent',
		discountValue: 30,
		duration: 'once',
		durationInMonths: null,
		maxRedemptions: null,
		redemptionsCount: 0,
		validFrom: daysFromNow(-60),
		validUntil: daysFromNow(-30),
		active: true
	},
	{
		label: 'max-redemptions-reached',
		code: 'LIMITED',
		discountType: 'percent',
		discountValue: 40,
		duration: 'once',
		durationInMonths: null,
		maxRedemptions: 10,
		redemptionsCount: 10,
		validFrom: null,
		validUntil: null,
		active: true
	},
	{
		label: 'inactive',
		code: 'PAUSED',
		discountType: 'percent',
		discountValue: 20,
		duration: 'once',
		durationInMonths: null,
		maxRedemptions: null,
		redemptionsCount: 0,
		validFrom: null,
		validUntil: null,
		active: false
	},
	{
		label: 'future-start',
		code: 'LAUNCH2027',
		discountType: 'amount',
		discountValue: 5000,
		duration: 'once',
		durationInMonths: null,
		maxRedemptions: null,
		redemptionsCount: 0,
		validFrom: daysFromNow(180),
		validUntil: daysFromNow(270),
		active: true
	}
];

export async function seedCoupons(db: DbT): Promise<void> {
	console.log('[seed] coupons...');
	for (const c of coupons) {
		await db
			.insert(schema.coupons)
			.values({
				code: c.code,
				discountType: c.discountType,
				discountValue: c.discountValue,
				duration: c.duration,
				durationInMonths: c.durationInMonths,
				maxRedemptions: c.maxRedemptions,
				redemptionsCount: c.redemptionsCount,
				validFrom: c.validFrom,
				validUntil: c.validUntil,
				active: c.active
			})
			.onConflictDoUpdate({
				target: schema.coupons.code,
				set: {
					discountType: c.discountType,
					discountValue: c.discountValue,
					duration: c.duration,
					durationInMonths: c.durationInMonths,
					maxRedemptions: c.maxRedemptions,
					redemptionsCount: c.redemptionsCount,
					validFrom: c.validFrom,
					validUntil: c.validUntil,
					active: c.active,
					updatedAt: new Date()
				}
			});
	}
	console.log(`[seed]   ✓ ${coupons.length} coupons`);
}
