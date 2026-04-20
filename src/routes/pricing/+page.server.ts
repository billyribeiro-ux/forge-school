import { db } from '$lib/server/db';
import { listActiveProductsWithPrices } from '$lib/server/db/queries';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const products = await listActiveProductsWithPrices(db);
	return { products };
};
