import { describe, it, expect } from 'vitest';
import {
	tierAtLeast,
	tierFromEntitlements,
	tierLabel,
	type EntitlementWithKind
} from '../../src/lib/entitlements/tier.ts';

function makeEnt(over: Partial<EntitlementWithKind> = {}): EntitlementWithKind {
	return {
		id: 'e1',
		sessionId: 's1',
		productId: 'p1',
		source: 'subscription',
		sourceRef: null,
		grantedAt: new Date(),
		revokedAt: null,
		productKind: 'subscription',
		...over
	};
}

describe('tierFromEntitlements', () => {
	it('returns free for empty input', () => {
		expect(tierFromEntitlements([])).toBe('free');
	});

	it('returns free when every entitlement is revoked', () => {
		const revoked = makeEnt({ revokedAt: new Date() });
		expect(tierFromEntitlements([revoked])).toBe('free');
	});

	it('returns pro for an active subscription entitlement', () => {
		expect(tierFromEntitlements([makeEnt({ source: 'subscription' })])).toBe('pro');
	});

	it('returns pro for a trial entitlement', () => {
		expect(tierFromEntitlements([makeEnt({ source: 'trial' })])).toBe('pro');
	});

	it('returns lifetime for a purchase entitlement on a lifetime product', () => {
		expect(
			tierFromEntitlements([makeEnt({ source: 'purchase', productKind: 'lifetime' })])
		).toBe('lifetime');
	});

	it('prefers lifetime when both a subscription and a lifetime entitlement are active', () => {
		const subscription = makeEnt({
			id: 'e1',
			source: 'subscription',
			productKind: 'subscription'
		});
		const lifetime = makeEnt({ id: 'e2', source: 'purchase', productKind: 'lifetime' });
		expect(tierFromEntitlements([subscription, lifetime])).toBe('lifetime');
	});

	it('ignores a purchase entitlement on a non-lifetime product', () => {
		expect(
			tierFromEntitlements([makeEnt({ source: 'purchase', productKind: 'course' })])
		).toBe('free');
	});

	it('ignores a grant source (admin grants of arbitrary products)', () => {
		expect(tierFromEntitlements([makeEnt({ source: 'grant', productKind: 'course' })])).toBe(
			'free'
		);
	});
});

describe('tierAtLeast', () => {
	it('free clears free', () => {
		expect(tierAtLeast('free', 'free')).toBe(true);
	});
	it('free does not clear pro', () => {
		expect(tierAtLeast('free', 'pro')).toBe(false);
	});
	it('pro clears pro', () => {
		expect(tierAtLeast('pro', 'pro')).toBe(true);
	});
	it('lifetime clears pro', () => {
		expect(tierAtLeast('lifetime', 'pro')).toBe(true);
	});
	it('pro does not clear lifetime', () => {
		expect(tierAtLeast('pro', 'lifetime')).toBe(false);
	});
});

describe('tierLabel', () => {
	it('returns capitalised labels', () => {
		expect(tierLabel('free')).toBe('Free');
		expect(tierLabel('pro')).toBe('Pro');
		expect(tierLabel('lifetime')).toBe('Lifetime');
	});
});
