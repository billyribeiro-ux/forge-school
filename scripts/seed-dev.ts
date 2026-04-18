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

async function main(): Promise<void> {
	const client = postgres(databaseUrl, { max: 1, prepare: false });
	const db = drizzle(client, { schema });

	try {
		console.log('[seed] inserting dev fixtures...');
		// Intentional placeholder — lesson 025 fills this in with the first
		// real product + price seed. Keeping the skeleton green (no-op) now
		// so `pnpm db:seed` is callable and the guard path is exercised.
		await db.execute('SELECT 1');
		console.log('[seed] done');
	} finally {
		await client.end({ timeout: 5 });
	}
}

await main();
