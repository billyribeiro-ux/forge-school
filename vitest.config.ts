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
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
	resolve: {
		alias: {
			$lib: `${root}src/lib`,
			$app: `${root}tests/stubs/app`,
			'$env/static/private': `${root}tests/stubs/env-private.ts`,
			'$env/static/public': `${root}tests/stubs/env-public.ts`
		}
	},
	test: {
		environment: 'node',
		globals: false,
		include: ['src/**/*.{test,spec}.ts', 'tests/**/*.{test,spec}.ts'],
		setupFiles: ['./tests/setup.ts']
	}
});
