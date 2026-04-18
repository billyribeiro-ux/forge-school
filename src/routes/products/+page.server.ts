import { db } from '$lib/server/db';
import {
	listActiveProductsWithPrices,
	listCategoriesWithProductCounts
} from '$lib/server/db/queries';

export const load = async () => {
	const [products, categories] = await Promise.all([
		listActiveProductsWithPrices(db),
		listCategoriesWithProductCounts(db)
	]);
	const featured = products
		.filter((p) => p.featuredOrder !== null)
		.sort((a, b) => (a.featuredOrder ?? 0) - (b.featuredOrder ?? 0));
	const all = products;
	return { featured, all, categories: categories.filter((c) => c.productCount > 0) };
};
