import { db } from '$lib/server/db';
import { searchActiveProducts } from '$lib/server/db/queries';

export const load = async ({ url }) => {
	const q = url.searchParams.get('q') ?? '';
	const results = q.trim() === '' ? [] : await searchActiveProducts(db, q);
	return { q, results };
};
