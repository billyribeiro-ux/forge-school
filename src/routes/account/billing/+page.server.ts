import { db } from '$lib/server/db';
import {
	listCompletedOrdersForSession,
	listSubscriptionsForSession
} from '$lib/server/db/billing-queries';
import { listEntitlementsForSession } from '$lib/server/entitlements';
import { ensureSessionCookie } from '$lib/server/session';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const sessionId = ensureSessionCookie(cookies);
	const [subscriptions, payments, entitlements] = await Promise.all([
		listSubscriptionsForSession(db, sessionId),
		listCompletedOrdersForSession(db, sessionId),
		listEntitlementsForSession(db, sessionId)
	]);
	return { sessionId, subscriptions, payments, entitlements };
};
