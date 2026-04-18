/**
 * Integration tests for src/lib/server/db/queries.ts.
 *
 * These tests hit a real Postgres instance — the same one `pnpm dev`
 * uses. They depend on the seed data from `pnpm db:reset && pnpm db:seed`
 * being present, specifically the ForgeSchool Lifetime product at
 * slug 'forgeschool-lifetime'.
 *
 * No mocks. Mocking the DB would let queries drift from the real
 * behavior Postgres enforces (constraint violations, ordering, NULL
 * handling, enum coercion). Integration tests against the real DB
 * are the PE7 contract.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getProductBySlug, listActivePricesForProduct } from './queries.ts';
import * as schema from './schema.ts';

const databaseUrl = process.env['DATABASE_URL'];
if (databaseUrl === undefined || databaseUrl === '') {
	throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local before running tests.');
}

const client = postgres(databaseUrl, { max: 1, prepare: false });
const db = drizzle(client, { schema });

describe('queries — products', () => {
	beforeAll(async () => {
		const row = await getProductBySlug(db, 'forgeschool-lifetime');
		if (row === null) {
			throw new Error(
				'Seed row "forgeschool-lifetime" not found. Run `pnpm db:reset && pnpm db:seed` first.'
			);
		}
	});

	afterAll(async () => {
		await client.end({ timeout: 5 });
	});

	it('returns the seeded lifetime product by slug', async () => {
		const product = await getProductBySlug(db, 'forgeschool-lifetime');

		expect(product).not.toBeNull();
		expect(product?.slug).toBe('forgeschool-lifetime');
		expect(product?.kind).toBe('lifetime');
		expect(product?.status).toBe('active');
		expect(product?.name).toBe('ForgeSchool — Lifetime');
	});

	it('returns null for an unknown slug', async () => {
		const product = await getProductBySlug(db, 'nonexistent-product-slug');
		expect(product).toBeNull();
	});

	it('lists active prices in creation order', async () => {
		const product = await getProductBySlug(db, 'forgeschool-lifetime');
		if (product === null) {
			throw new Error('product should exist — checked in beforeAll');
		}

		const activePrices = await listActivePricesForProduct(db, product.id);

		expect(activePrices.length).toBeGreaterThanOrEqual(1);
		const lifetime = activePrices.find(
			(p) => p.stripePriceId === 'price_test_forgeschool_lifetime_497'
		);
		expect(lifetime).toBeDefined();
		expect(lifetime?.unitAmountCents).toBe(49700);
		expect(lifetime?.currency).toBe('usd');
		expect(lifetime?.interval).toBe('one_time');
		expect(lifetime?.active).toBe(true);
	});
});
