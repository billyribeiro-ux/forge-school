/**
 * Playwright configuration.
 *
 * E2E tests live in `tests/e2e/`. They assume:
 *  - Postgres is up (`docker compose up -d --wait`)
 *  - DB is migrated + seeded (`pnpm db:reset && pnpm db:seed`)
 *  - Dev server starts automatically via webServer config
 *  - Real Stripe test keys in .env.local for checkout E2Es that hit Stripe
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: 'tests/e2e',
	fullyParallel: false,
	retries: process.env['CI'] !== undefined ? 2 : 0,
	workers: 1,
	reporter: 'list',
	use: {
		baseURL: 'http://localhost:5173',
		trace: 'on-first-retry'
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	],
	webServer: {
		command: 'pnpm dev',
		url: 'http://localhost:5173',
		reuseExistingServer: true,
		timeout: 60_000
	}
});
