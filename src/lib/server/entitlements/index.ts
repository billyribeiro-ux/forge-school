/**
 * Entitlements — the grant-truth layer.
 *
 * Per `docs/ARCHITECTURE.md §4.3`, every client-facing access check
 * consults entitlements, never orders. This module is the only place
 * that writes to the entitlements table. Webhook handlers (lessons
 * 049-053) delegate here so the grant/revoke logic is single-sourced
 * and testable in isolation.
 *
 * Conventions:
 *  - `grant*` functions use UPSERT with `revoked_at: null` so a
 *    re-delivery of an event clears any prior revocation.
 *  - `revoke*` functions use UPDATE to soft-delete via `revoked_at`,
 *    preserving the audit trail.
 *  - `hasEntitlement` is the only READ in this module; gating routes
 *    and load functions call it to check access.
 */
import { and, eq, isNull } from 'drizzle-orm';
import type { Db } from '$lib/server/db';
import {
	type Entitlement,
	entitlements,
	type NewEntitlement,
	products
} from '$lib/server/db/schema';

export async function grantPurchaseEntitlement(
	db: Db,
	args: { sessionId: string; productId: string; sourceRef: string }
): Promise<void> {
	const row: NewEntitlement = {
		sessionId: args.sessionId,
		productId: args.productId,
		source: 'purchase',
		sourceRef: args.sourceRef
	};
	await db
		.insert(entitlements)
		.values(row)
		.onConflictDoUpdate({
			target: [entitlements.sessionId, entitlements.productId, entitlements.source],
			set: { revokedAt: null, sourceRef: args.sourceRef }
		});
}

export async function grantSubscriptionEntitlement(
	db: Db,
	args: { sessionId: string; productId: string; subscriptionId: string }
): Promise<void> {
	const row: NewEntitlement = {
		sessionId: args.sessionId,
		productId: args.productId,
		source: 'subscription',
		sourceRef: args.subscriptionId
	};
	await db
		.insert(entitlements)
		.values(row)
		.onConflictDoUpdate({
			target: [entitlements.sessionId, entitlements.productId, entitlements.source],
			set: { revokedAt: null, sourceRef: args.subscriptionId }
		});
}

export async function revokePurchaseEntitlementsForSession(
	db: Db,
	args: { sessionId: string }
): Promise<void> {
	await db
		.update(entitlements)
		.set({ revokedAt: new Date() })
		.where(
			and(
				eq(entitlements.sessionId, args.sessionId),
				eq(entitlements.source, 'purchase'),
				isNull(entitlements.revokedAt)
			)
		);
}

export async function revokeSubscriptionEntitlement(
	db: Db,
	args: { sessionId: string; productId: string }
): Promise<void> {
	await db
		.update(entitlements)
		.set({ revokedAt: new Date() })
		.where(
			and(
				eq(entitlements.sessionId, args.sessionId),
				eq(entitlements.productId, args.productId),
				eq(entitlements.source, 'subscription'),
				isNull(entitlements.revokedAt)
			)
		);
}

/**
 * True if the session has a non-revoked entitlement for the given
 * product slug. The single read call every gated route makes.
 */
export async function hasEntitlement(
	db: Db,
	args: { sessionId: string; productSlug: string }
): Promise<boolean> {
	const [row] = await db
		.select({ id: entitlements.id })
		.from(entitlements)
		.innerJoin(products, eq(products.id, entitlements.productId))
		.where(
			and(
				eq(entitlements.sessionId, args.sessionId),
				eq(products.slug, args.productSlug),
				isNull(entitlements.revokedAt)
			)
		)
		.limit(1);
	return row !== undefined;
}

export async function listEntitlementsForSession(
	db: Db,
	sessionId: string
): Promise<Entitlement[]> {
	return db
		.select()
		.from(entitlements)
		.where(and(eq(entitlements.sessionId, sessionId), isNull(entitlements.revokedAt)));
}
