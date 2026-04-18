/**
 * ForgeSchool — database reset.
 *
 * Drops every table, type, and function in the public schema, then
 * re-applies every migration. Use this to wipe a development database
 * back to a freshly-migrated state without needing to restart Docker or
 * delete the volume.
 *
 * REFUSES to run against anything that looks like a production DATABASE_URL.
 * The guard is a belt-and-suspenders check on top of NODE_ENV — a leaked
 * staging URL in an env file should not cause a reset by accident.
 *
 * Invoke via:
 *     pnpm db:reset
 */
import { config } from 'dotenv';
import { spawnSync } from 'node:child_process';
import postgres from 'postgres';

config({ path: '.env.local' });
config();

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined || databaseUrl === '') {
	console.error('[reset] DATABASE_URL is not set.');
	process.exit(1);
}

function refuseIfProdLike(url: string): void {
	const redFlags = [
		/prod/i,
		/production/i,
		/\.amazonaws\.com/i,
		/\.rds\./i,
		/\.supabase\.co/i,
		/\.neon\.tech/i,
		/\.railway\.app/i,
		/\.render\.com/i
	];
	const hit = redFlags.find((pattern) => pattern.test(url));
	if (hit !== undefined) {
		console.error(
			`[reset] DATABASE_URL matches "${hit.source}" — refusing to drop.\n` +
				'        This script only runs against local development databases.'
		);
		process.exit(1);
	}
	if (process.env.NODE_ENV === 'production') {
		console.error('[reset] NODE_ENV=production — refusing to drop.');
		process.exit(1);
	}
}

async function main(): Promise<void> {
	refuseIfProdLike(databaseUrl as string);

	const client = postgres(databaseUrl as string, { max: 1, prepare: false });
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
