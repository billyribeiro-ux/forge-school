/**
 * Membership tier derivation — maps a session's live entitlements to
 * a single tier label the UI can key on.
 *
 * Tiers, from lowest to highest:
 *   - 'free'      — no active entitlements.
 *   - 'pro'       — at least one active subscription-sourced entitlement.
 *   - 'lifetime'  — at least one active purchase-sourced entitlement to
 *                   a lifetime-kind product.
 *
 * Pure function, no DB access. Callers pass in already-loaded
 * entitlements + their product kinds. Unit-tested in isolation.
 */
import type { Entitlement } from '$lib/server/db/schema';

export type Tier = 'free' | 'pro' | 'lifetime';

export type EntitlementWithKind = Entitlement & {
	productKind: 'course' | 'bundle' | 'subscription' | 'lifetime';
};

export function tierFromEntitlements(entitlements: readonly EntitlementWithKind[]): Tier {
	const active = entitlements.filter((e) => e.revokedAt === null);
	if (active.length === 0) return 'free';

	for (const e of active) {
		if (e.source === 'purchase' && e.productKind === 'lifetime') return 'lifetime';
	}
	for (const e of active) {
		if (e.source === 'subscription' || e.source === 'trial') return 'pro';
	}
	return 'free';
}

const RANK: Record<Tier, number> = { free: 0, pro: 1, lifetime: 2 };

export function tierAtLeast(actual: Tier, required: Tier): boolean {
	return RANK[actual] >= RANK[required];
}

export function tierLabel(tier: Tier): string {
	switch (tier) {
		case 'free':
			return 'Free';
		case 'pro':
			return 'Pro';
		case 'lifetime':
			return 'Lifetime';
	}
}
