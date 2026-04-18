/**
 * Drizzle Kit configuration — governs migration generation, migration
 * application, and Drizzle Studio.
 *
 * Migration SQL + snapshots live under `drizzle/migrations/` and are
 * committed to the repo. The `schema` path is the single source of truth
 * for the database shape; migrations are derived artifacts.
 */
import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

// Load .env.local first (local overrides), then .env as fallback.
config({ path: '.env.local' });
config();

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined || databaseUrl === '') {
	throw new Error(
		'DATABASE_URL is not set. Copy .env.example to .env.local and fill it in before running drizzle-kit.'
	);
}

export default defineConfig({
	dialect: 'postgresql',
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle/migrations',
	dbCredentials: {
		url: databaseUrl
	},
	strict: true,
	verbose: true
});
