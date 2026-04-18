/**
 * Shared env + safety helpers for dev scripts.
 *
 * Scripts under `scripts/` run outside SvelteKit, so `$env/static/private`
 * is not available. Every script should call `loadEnv()` once at the top
 * and use `requireDatabaseUrl()` to extract DATABASE_URL with a clear
 * error when unset.
 *
 * `refuseIfProdLike()` hard-stops destructive scripts against anything
 * that looks like a hosted / production database. Every destructive
 * script (reset, seed, any future teardown) MUST call this first.
 */
import { config } from 'dotenv';

export function loadEnv(): void {
	config({ path: '.env.local' });
	config();
}

export function requireDatabaseUrl(scriptName: string): string {
	const url = process.env.DATABASE_URL;
	if (url === undefined || url === '') {
		console.error(`[${scriptName}] DATABASE_URL is not set. Fill in .env.local.`);
		process.exit(1);
	}
	return url;
}

export function refuseIfProdLike(scriptName: string, url: string): void {
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
			`[${scriptName}] DATABASE_URL matches "${hit.source}" — refusing to run.\n` +
				`        This script only runs against local development databases.`
		);
		process.exit(1);
	}
	if (process.env.NODE_ENV === 'production') {
		console.error(`[${scriptName}] NODE_ENV=production — refusing to run.`);
		process.exit(1);
	}
}
