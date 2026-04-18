/**
 * Typed query helpers over the Drizzle db instance.
 *
 * Keeping query functions in a dedicated module (vs. inline in load
 * functions / endpoints) gives us a testable, named surface for every
 * data-access pattern the app uses. One function == one test.
 */
import { and, eq } from 'drizzle-orm';
import type { Db } from './index.ts';
import { prices, products, type Price, type Product } from './schema.ts';

export type ProductWithPrices = Product & { prices: Price[] };

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
