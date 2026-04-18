import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { prices, products } from '$lib/server/db/schema';

export const load = async ({ params }) => {
	const [product] = await db
		.select()
		.from(products)
		.where(and(eq(products.slug, params.slug), eq(products.status, 'active')))
		.limit(1);

	if (product === undefined) {
		error(404, {
			message: `Product "${params.slug}" not found`,
			errorId: `product-not-found-${params.slug}`
		});
	}

	const productPrices = await db
		.select()
		.from(prices)
		.where(and(eq(prices.productId, product.id), eq(prices.active, true)))
		.orderBy(prices.createdAt);

	return { product, prices: productPrices };
};
