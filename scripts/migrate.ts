/**
 * ForgeSchool — migration runner.
 *
 * Applies every not-yet-applied migration under drizzle/migrations/
 * against the database referenced by DATABASE_URL. Runs inside a
 * transaction per file; partial application is impossible.
 *
 * Invoke via:
 *     pnpm db:migrate
 *
 * This script runs outside SvelteKit (no $env), so it reads env via
 * dotenv in the same priority order as drizzle.config.ts:
 *   .env.local (local overrides) -> .env (fallback)
 */
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

config({ path: '.env.local' });
config();

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined || databaseUrl === '') {
	console.error(
		'[migrate] DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.'
	);
	process.exit(1);
}

async function main(): Promise<void> {
	// Use a dedicated connection with max=1 so the migrator runs serially
	// and never races against an app connection.
	const client = postgres(databaseUrl as string, { max: 1, prepare: false });

	try {
		console.log('[migrate] applying migrations...');
		await migrate(drizzle(client), { migrationsFolder: './drizzle/migrations' });
		console.log('[migrate] done');
	} finally {
		await client.end({ timeout: 5 });
	}
}

await main();
