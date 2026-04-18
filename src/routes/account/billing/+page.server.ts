import { db } from '$lib/server/db';
import {
	listCompletedOrdersForSession,
	listSubscriptionsForSession
} from '$lib/server/db/billing-queries';
import { getSessionEntitlementsWithKind } from '$lib/server/entitlements/tier-queries';
import { listEntitlementsForSession } from '$lib/server/entitlements';
import { ensureSessionCookie } from '$lib/server/session';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const sessionId = ensureSessionCookie(cookies);
	const [subscriptions, payments, entitlements, entitlementsWithKind] = await Promise.all([
		listSubscriptionsForSession(db, sessionId),
		listCompletedOrdersForSession(db, sessionId),
		listEntitlementsForSession(db, sessionId),
		getSessionEntitlementsWithKind(db, sessionId)
	]);
	const lifetimeEntitlements = entitlementsWithKind.filter(
		(e) => e.source === 'purchase' && e.productKind === 'lifetime'
	);
	return { sessionId, subscriptions, payments, entitlements, lifetimeEntitlements };
};
