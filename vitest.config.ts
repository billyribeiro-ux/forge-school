/**
 * Vitest configuration.
 *
 * Integration + unit tests run in the Node environment. Tests that touch
 * the database assume Postgres is running via `docker compose up -d` and
 * has been migrated + seeded via `pnpm db:reset && pnpm db:seed`.
 *
 * The global setup file (tests/setup.ts) loads .env.local so every test
 * sees the same DATABASE_URL as the dev server.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		globals: false,
		include: ['src/**/*.{test,spec}.ts', 'tests/**/*.{test,spec}.ts'],
		setupFiles: ['./tests/setup.ts']
	}
});
