/**
 * Typed query helpers over the Drizzle db instance.
 *
 * Keeping query functions in a dedicated module (vs. inline in load
 * functions / endpoints) gives us a testable, named surface for every
 * data-access pattern the app uses. One function == one test.
 */
import { eq } from 'drizzle-orm';
import type { Db } from './index.ts';
import { prices, products, type Price, type Product } from './schema.ts';

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
		.where(eq(prices.productId, productId))
		.orderBy(prices.createdAt);
}
