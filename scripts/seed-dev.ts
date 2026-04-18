/**
 * ForgeSchool — development seed.
 *
 * Populates a freshly-migrated database with predictable dev data so
 * `pnpm dev` can render real products, prices, and carts without manual
 * setup. Idempotent within a single invocation (ON CONFLICT DO NOTHING
 * on unique columns).
 *
 * Local-dev only. Refuses to run against anything that looks like a
 * production DATABASE_URL, and refuses if NODE_ENV=production.
 *
 * Invoke via:
 *     pnpm db:seed
 *
 * Or the full reset+seed loop:
 *     pnpm db:reset && pnpm db:seed
 *
 * Lesson 025 extends this script with the first test product. This
 * lesson establishes the skeleton and safety guards.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/lib/server/db/schema.ts';
import { loadEnv, refuseIfProdLike, requireDatabaseUrl } from './lib/env.ts';

loadEnv();
const databaseUrl = requireDatabaseUrl('seed');
refuseIfProdLike('seed', databaseUrl);

async function seedProducts(db: ReturnType<typeof drizzle<typeof schema>>): Promise<void> {
	console.log('[seed] products + prices...');

	const [lifetime] = await db
		.insert(schema.products)
		.values({
			slug: 'forgeschool-lifetime',
			name: 'ForgeSchool — Lifetime',
			description:
				'One-time purchase, permanent access to every lesson and every future module.',
			kind: 'lifetime',
			status: 'active',
			stripeProductId: 'prod_test_forgeschool_lifetime'
		})
		.onConflictDoNothing({ target: schema.products.slug })
		.returning();

	// `returning()` on a skipped conflict returns an empty array. Look the row
	// up explicitly so the price insert has a productId to point at.
	const lifetimeRow =
		lifetime ??
		(await db.query.products.findFirst({
			where: (p, { eq }) => eq(p.slug, 'forgeschool-lifetime')
		}));

	if (lifetimeRow === undefined) {
		throw new Error('[seed] failed to locate ForgeSchool Lifetime product after upsert');
	}

	await db
		.insert(schema.prices)
		.values({
			productId: lifetimeRow.id,
			stripePriceId: 'price_test_forgeschool_lifetime_497',
			currency: 'usd',
			unitAmountCents: 49700,
			interval: 'one_time',
			active: true
		})
		.onConflictDoNothing({ target: schema.prices.stripePriceId });

	console.log('[seed]   ✓ ForgeSchool Lifetime @ $497 (test mode)');
}

async function main(): Promise<void> {
	const client = postgres(databaseUrl, { max: 1, prepare: false });
	const db = drizzle(client, { schema });

	try {
		console.log('[seed] inserting dev fixtures...');
		await seedProducts(db);
		console.log('[seed] done');
	} finally {
		await client.end({ timeout: 5 });
	}
}

await main();
