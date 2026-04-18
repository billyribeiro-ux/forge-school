import { tierLabel } from '$lib/entitlements/tier';
import { db } from '$lib/server/db';
import { getSessionEntitlementsWithKind } from '$lib/server/entitlements/tier-queries';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const entitlementsWithKind = await getSessionEntitlementsWithKind(db, locals.sessionId);
	const entitlementCount = entitlementsWithKind.length;
	return {
		sessionId: locals.sessionId,
		tier: locals.tier,
		tierLabel: tierLabel(locals.tier),
		entitlementCount
	};
};
