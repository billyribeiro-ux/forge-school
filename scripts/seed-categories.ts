/**
 * Adjunct seed: curated product categories + the memberships linking
 * each seeded product to the categories it belongs to.
 *
 * Categories are the editorial browse axis (`/products/category/<slug>`),
 * orthogonal to `products.kind` (which is a billing primitive) and to
 * `products.tags` (which is a flat label). One product can belong to
 * many categories.
 *
 * DB-only. Idempotent: rerun is a no-op on the join table.
 */
import { eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../src/lib/server/db/schema.ts';

type DbT = ReturnType<typeof drizzle<typeof schema>>;

type CategorySpec = {
	slug: string;
	name: string;
	description: string;
	productSlugs: string[];
};

const categories: CategorySpec[] = [
	{
		slug: 'foundations',
		name: 'Foundations',
		description: 'Start here — the fundamentals every ForgeSchool student ships with.',
		productSlugs: ['forgeschool-lifetime']
	},
	{
		slug: 'production-grade',
		name: 'Production Grade',
		description: 'Advanced material — webhooks, observability, migrations, CI.',
		productSlugs: ['forgeschool-lifetime', 'forgeschool-pro-yearly']
	},
	{
		slug: 'platform',
		name: 'Platform Access',
		description: 'Every lesson, every module. Monthly, yearly, or lifetime.',
		productSlugs: ['forgeschool-lifetime', 'forgeschool-pro-monthly', 'forgeschool-pro-yearly']
	}
];

export async function seedCategories(db: DbT): Promise<void> {
	console.log('[seed] categories + memberships...');

	for (const spec of categories) {
		const [category] = await db
			.insert(schema.productCategories)
			.values({ slug: spec.slug, name: spec.name, description: spec.description })
			.onConflictDoUpdate({
				target: schema.productCategories.slug,
				set: { name: spec.name, description: spec.description, updatedAt: new Date() }
			})
			.returning();

		if (category === undefined) {
			throw new Error(`[seed] failed to upsert category ${spec.slug}`);
		}

		for (const productSlug of spec.productSlugs) {
			const [product] = await db
				.select({ id: schema.products.id })
				.from(schema.products)
				.where(eq(schema.products.slug, productSlug))
				.limit(1);

			if (product === undefined) {
				console.warn(
					`[seed]   ! category "${spec.slug}" references unknown product "${productSlug}" — skipping`
				);
				continue;
			}

			await db
				.insert(schema.productCategoryMemberships)
				.values({ productId: product.id, categoryId: category.id })
				.onConflictDoNothing();
		}
	}

	console.log(`[seed]   ✓ ${categories.length} categories`);
}
