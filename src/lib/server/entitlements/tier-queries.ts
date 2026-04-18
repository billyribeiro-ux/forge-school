/**
 * Server-side entitlement → tier lookups.
 *
 * Lives in `server/` because it hits Postgres. Callers are any load
 * function that needs to render UI differently for pro vs. free (the
 * /account page, the /course gate, the RenewalBanner in Module 6).
 */
import { and, eq, isNull } from 'drizzle-orm';
import type { Db } from '$lib/server/db';
import { entitlements, products } from '$lib/server/db/schema';
import {
	tierFromEntitlements,
	type EntitlementWithKind,
	type Tier
} from '$lib/entitlements/tier';

export async function getSessionEntitlementsWithKind(
	db: Db,
	sessionId: string
): Promise<EntitlementWithKind[]> {
	const rows = await db
		.select({ entitlement: entitlements, productKind: products.kind })
		.from(entitlements)
		.innerJoin(products, eq(products.id, entitlements.productId))
		.where(and(eq(entitlements.sessionId, sessionId), isNull(entitlements.revokedAt)));

	return rows.map((r) => ({ ...r.entitlement, productKind: r.productKind }));
}

export async function getSessionTier(db: Db, sessionId: string): Promise<Tier> {
	const ents = await getSessionEntitlementsWithKind(db, sessionId);
	return tierFromEntitlements(ents);
}
