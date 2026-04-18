import { db } from '$lib/server/db';
import { listActiveProductsWithPrices } from '$lib/server/db/queries';

export const load = async () => {
	const products = await listActiveProductsWithPrices(db);
	return { products };
};
