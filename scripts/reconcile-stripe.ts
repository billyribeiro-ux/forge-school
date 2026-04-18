/**
 * scripts/reconcile-stripe.ts
 *
 * Diffs the local DB's view of Stripe state against Stripe itself.
 * Surfaces mismatches a human (or a follow-up automation) can act on:
 *
 *   - Stripe products/prices missing from our DB (we never seeded them)
 *   - DB rows that point at deleted Stripe objects
 *   - Subscription / order rows with status drift since the last webhook
 *
 * Read-only. Never mutates Stripe; never mutates the DB. Output is a
 * human-readable report on stdout. Exit code 0 = clean, 1 = drift found.
 *
 * Local-dev only — same env-guard pattern as `scripts/seed-dev.ts`.
 *
 * Invoke:
 *     pnpm exec tsx scripts/reconcile-stripe.ts
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '../src/lib/server/db/schema.ts';
import { loadEnv, refuseIfProdLike, requireDatabaseUrl } from './lib/env.ts';
import { createStripe } from './lib/stripe.ts';

loadEnv();
const databaseUrl = requireDatabaseUrl('reconcile-stripe');
refuseIfProdLike('reconcile-stripe', databaseUrl);
const stripe = createStripe('reconcile-stripe');

type Report = {
	missingInDb: string[];
	deletedInStripe: string[];
	subscriptionDrift: Array<{ subscriptionId: string; dbStatus: string; stripeStatus: string }>;
	priceDrift: Array<{ priceId: string; dbAmountCents: number; stripeAmountCents: number }>;
};

async function reconcile(): Promise<Report> {
	const client = postgres(databaseUrl, { max: 1, prepare: false });
	const db = drizzle(client, { schema });

	const report: Report = {
		missingInDb: [],
		deletedInStripe: [],
		subscriptionDrift: [],
		priceDrift: []
	};

	try {
		// ── Products: Stripe ←→ DB ──────────────────────────────────────────
		const dbProducts = await db.select().from(schema.products);
		const stripeProducts = await stripe.products.list({ limit: 100, active: true });

		const dbStripeIds = new Set(
			dbProducts.map((p) => p.stripeProductId).filter((id): id is string => id !== null)
		);
		for (const sp of stripeProducts.data) {
			if (!dbStripeIds.has(sp.id)) report.missingInDb.push(`product:${sp.id}:${sp.name}`);
		}
		const stripeIds = new Set(stripeProducts.data.map((p) => p.id));
		for (const dp of dbProducts) {
			if (dp.stripeProductId !== null && !stripeIds.has(dp.stripeProductId)) {
				report.deletedInStripe.push(`product:${dp.stripeProductId}:${dp.slug}`);
			}
		}

		// ── Prices: amount drift ────────────────────────────────────────────
		const dbPrices = await db.select().from(schema.prices);
		for (const dp of dbPrices) {
			const sp = await stripe.prices
				.retrieve(dp.stripePriceId)
				.catch(() => null);
			if (sp === null) {
				report.deletedInStripe.push(`price:${dp.stripePriceId}`);
				continue;
			}
			const stripeAmount = sp.unit_amount ?? 0;
			if (stripeAmount !== dp.unitAmountCents) {
				report.priceDrift.push({
					priceId: dp.stripePriceId,
					dbAmountCents: dp.unitAmountCents,
					stripeAmountCents: stripeAmount
				});
			}
		}

		// ── Subscriptions: status drift ─────────────────────────────────────
		const dbSubs = await db.select().from(schema.subscriptions);
		for (const dbSub of dbSubs) {
			const ss = await stripe.subscriptions
				.retrieve(dbSub.stripeSubscriptionId)
				.catch(() => null);
			if (ss === null) {
				report.deletedInStripe.push(`subscription:${dbSub.stripeSubscriptionId}`);
				continue;
			}
			if (ss.status !== dbSub.status) {
				report.subscriptionDrift.push({
					subscriptionId: dbSub.stripeSubscriptionId,
					dbStatus: dbSub.status,
					stripeStatus: ss.status
				});
			}
		}
	} finally {
		await client.end({ timeout: 5 });
	}
	return report;
}

function printReport(r: Report): boolean {
	console.log('[reconcile-stripe] report:\n');
	let hasDrift = false;

	if (r.missingInDb.length > 0) {
		hasDrift = true;
		console.log(`  Missing in DB (${r.missingInDb.length}):`);
		for (const id of r.missingInDb) console.log(`    - ${id}`);
	}
	if (r.deletedInStripe.length > 0) {
		hasDrift = true;
		console.log(`  Deleted in Stripe (${r.deletedInStripe.length}):`);
		for (const id of r.deletedInStripe) console.log(`    - ${id}`);
	}
	if (r.priceDrift.length > 0) {
		hasDrift = true;
		console.log(`  Price drift (${r.priceDrift.length}):`);
		for (const d of r.priceDrift) {
			console.log(
				`    - ${d.priceId}: db=${d.dbAmountCents} stripe=${d.stripeAmountCents}`
			);
		}
	}
	if (r.subscriptionDrift.length > 0) {
		hasDrift = true;
		console.log(`  Subscription status drift (${r.subscriptionDrift.length}):`);
		for (const d of r.subscriptionDrift) {
			console.log(`    - ${d.subscriptionId}: db=${d.dbStatus} stripe=${d.stripeStatus}`);
		}
	}
	if (!hasDrift) console.log('  ✓ No drift detected.');
	return hasDrift;
}

const result = await reconcile();
const drift = printReport(result);
process.exit(drift ? 1 : 0);

// Suppress unused warning when no callers reach for the helper.
void eq;
