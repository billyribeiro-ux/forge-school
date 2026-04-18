/**
 * Typed query helpers over the Drizzle db instance.
 *
 * Keeping query functions in a dedicated module (vs. inline in load
 * functions / endpoints) gives us a testable, named surface for every
 * data-access pattern the app uses. One function == one test.
 */
import { and, eq, ilike, or, sql } from 'drizzle-orm';
import type { Db } from './index.ts';
import {
	prices,
	productCategories,
	productCategoryMemberships,
	products,
	type Price,
	type Product,
	type ProductCategory,
	type ProductKindValue
} from './schema.ts';

export type ProductWithPrices = Product & { prices: Price[] };

export type CategoryWithCount = ProductCategory & { productCount: number };

/**
 * Load a product by its slug. Returns `null` when not found.
 *
 * Slug is the user-facing identifier — pricing URLs, admin links, and
 * seed scripts reference products by slug, never by UUID.
 */
export async function getProductBySlug(db: Db, slug: string): Promise<Product | null> {
	const [row] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
	return row ?? null;
}

/**
 * List every active price for a product, in insertion order. Returns
 * [] when the product has no active prices (e.g., pricing not yet
 * configured, or all prices archived).
 */
export async function listActivePricesForProduct(db: Db, productId: string): Promise<Price[]> {
	return db
		.select()
		.from(prices)
		.where(and(eq(prices.productId, productId), eq(prices.active, true)))
		.orderBy(prices.createdAt);
}

/**
 * List every product category with a pre-computed count of ACTIVE
 * products in each. Drives the "Browse by category" strip on /products
 * and the category index route.
 */
export async function listCategoriesWithProductCounts(db: Db): Promise<CategoryWithCount[]> {
	const rows = await db
		.select({
			category: productCategories,
			productCount: sql<number>`count(${products.id}) filter (where ${products.status} = 'active')::int`
		})
		.from(productCategories)
		.leftJoin(
			productCategoryMemberships,
			eq(productCategoryMemberships.categoryId, productCategories.id)
		)
		.leftJoin(products, eq(products.id, productCategoryMemberships.productId))
		.groupBy(productCategories.id)
		.orderBy(productCategories.name);

	return rows.map((r) => ({ ...r.category, productCount: r.productCount }));
}

/**
 * List active products in a given category, with their active prices.
 * Returns `null` when the category slug is unknown. Returns an empty
 * `products` array when the category exists but has no active members
 * (e.g., a freshly-created category with no memberships yet).
 */
export async function listProductsByCategorySlug(
	db: Db,
	slug: string
): Promise<{ category: ProductCategory; products: ProductWithPrices[] } | null> {
	const [category] = await db
		.select()
		.from(productCategories)
		.where(eq(productCategories.slug, slug))
		.limit(1);

	if (category === undefined) {
		return null;
	}

	const rows = await db
		.select({ product: products, price: prices })
		.from(productCategoryMemberships)
		.innerJoin(products, eq(products.id, productCategoryMemberships.productId))
		.leftJoin(prices, and(eq(prices.productId, products.id), eq(prices.active, true)))
		.where(
			and(
				eq(productCategoryMemberships.categoryId, category.id),
				eq(products.status, 'active')
			)
		)
		.orderBy(products.createdAt, prices.createdAt);

	const byId = new Map<string, ProductWithPrices>();
	for (const row of rows) {
		let existing = byId.get(row.product.id);
		if (existing === undefined) {
			existing = { ...row.product, prices: [] };
			byId.set(row.product.id, existing);
		}
		if (row.price !== null) {
			existing.prices.push(row.price);
		}
	}

	return { category, products: [...byId.values()] };
}

export type ProductFilters = {
	kind?: ProductKindValue;
	categorySlug?: string;
	maxPriceCents?: number;
};

/**
 * Filter the active catalog by any combination of kind / category / max
 * price. Empty filters return the full active list. Max-price filters
 * on the CHEAPEST active price per product (a product with a $49 monthly
 * and $497 yearly clears a $100 max).
 */
export async function filterActiveProducts(
	db: Db,
	filters: ProductFilters
): Promise<ProductWithPrices[]> {
	const conditions = [eq(products.status, 'active')];
	if (filters.kind !== undefined) {
		conditions.push(eq(products.kind, filters.kind));
	}
	if (filters.categorySlug !== undefined) {
		conditions.push(
			sql`exists (
				select 1 from ${productCategoryMemberships} m
				join ${productCategories} c on c.id = m.category_id
				where m.product_id = ${products.id} and c.slug = ${filters.categorySlug}
			)`
		);
	}
	if (filters.maxPriceCents !== undefined) {
		conditions.push(
			sql`exists (
				select 1 from ${prices} p
				where p.product_id = ${products.id} and p.active = true
				  and p.unit_amount_cents <= ${filters.maxPriceCents}
			)`
		);
	}

	const rows = await db
		.select({ product: products, price: prices })
		.from(products)
		.leftJoin(prices, and(eq(prices.productId, products.id), eq(prices.active, true)))
		.where(and(...conditions))
		.orderBy(products.name, prices.createdAt);

	const byId = new Map<string, ProductWithPrices>();
	for (const row of rows) {
		let existing = byId.get(row.product.id);
		if (existing === undefined) {
			existing = { ...row.product, prices: [] };
			byId.set(row.product.id, existing);
		}
		if (row.price !== null) {
			existing.prices.push(row.price);
		}
	}
	return [...byId.values()];
}

/**
 * Case-insensitive product search across name, description, and tags.
 * Returns active products only, joined with their active prices.
 *
 * Implementation: `ILIKE '%query%'` on name and description + a tag
 * containment check. Fine at our current scale (three products, dozens
 * at most). A `tsvector` column is justified once the catalog exceeds
 * ~100 rows or users complain about search quality.
 */
export async function searchActiveProducts(
	db: Db,
	query: string
): Promise<ProductWithPrices[]> {
	const trimmed = query.trim();
	if (trimmed === '') return [];
	const pattern = `%${trimmed.replaceAll('%', '\\%').replaceAll('_', '\\_')}%`;

	const rows = await db
		.select({ product: products, price: prices })
		.from(products)
		.leftJoin(prices, and(eq(prices.productId, products.id), eq(prices.active, true)))
		.where(
			and(
				eq(products.status, 'active'),
				or(
					ilike(products.name, pattern),
					ilike(products.description, pattern),
					sql`exists (select 1 from unnest(${products.tags}) t where t ilike ${pattern})`
				)
			)
		)
		.orderBy(products.name, prices.createdAt);

	const byId = new Map<string, ProductWithPrices>();
	for (const row of rows) {
		let existing = byId.get(row.product.id);
		if (existing === undefined) {
			existing = { ...row.product, prices: [] };
			byId.set(row.product.id, existing);
		}
		if (row.price !== null) {
			existing.prices.push(row.price);
		}
	}
	return [...byId.values()];
}

/**
 * All active products with their active prices, ordered by product creation.
 * Drives the /pricing catalog and the checkout handoff.
 */
export async function listActiveProductsWithPrices(db: Db): Promise<ProductWithPrices[]> {
	const rows = await db
		.select({
			product: products,
			price: prices
		})
		.from(products)
		.leftJoin(prices, and(eq(prices.productId, products.id), eq(prices.active, true)))
		.where(eq(products.status, 'active'))
		.orderBy(products.createdAt, prices.createdAt);

	const byId = new Map<string, ProductWithPrices>();
	for (const row of rows) {
		let existing = byId.get(row.product.id);
		if (existing === undefined) {
			existing = { ...row.product, prices: [] };
			byId.set(row.product.id, existing);
		}
		if (row.price !== null) {
			existing.prices.push(row.price);
		}
	}
	return [...byId.values()];
}
