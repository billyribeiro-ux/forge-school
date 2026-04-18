/**
 * ForgeSchool — database reset.
 *
 * Drops every table, type, and function in the public schema, then
 * re-applies every migration. Local-dev only; refuses to run against
 * anything that looks like a production DATABASE_URL.
 *
 * Invoke via:
 *     pnpm db:reset
 */
import { spawnSync } from 'node:child_process';
import postgres from 'postgres';
import { loadEnv, refuseIfProdLike, requireDatabaseUrl } from './lib/env.ts';

loadEnv();
const databaseUrl = requireDatabaseUrl('reset');
refuseIfProdLike('reset', databaseUrl);

async function main(): Promise<void> {
	const client = postgres(databaseUrl, { max: 1, prepare: false });
	try {
		console.log('[reset] dropping public schema...');
		await client.unsafe('DROP SCHEMA IF EXISTS public CASCADE');
		await client.unsafe('CREATE SCHEMA public');
		await client.unsafe('GRANT ALL ON SCHEMA public TO CURRENT_USER');
		console.log('[reset] public schema recreated');
	} finally {
		await client.end({ timeout: 5 });
	}

	console.log('[reset] running migrations...');
	const result = spawnSync('pnpm', ['exec', 'tsx', 'scripts/migrate.ts'], {
		stdio: 'inherit'
	});
	if (result.status !== 0) {
		console.error('[reset] migration failed');
		process.exit(result.status ?? 1);
	}

	console.log('[reset] done');
}

await main();
