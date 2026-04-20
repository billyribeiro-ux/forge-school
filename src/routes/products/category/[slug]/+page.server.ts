import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { listProductsByCategorySlug } from '$lib/server/db/queries';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const result = await listProductsByCategorySlug(db, params.slug);

	if (result === null) {
		error(404, {
			message: `Category "${params.slug}" not found`,
			errorId: `category-not-found-${params.slug}`
		});
	}

	return { category: result.category, products: result.products };
};
