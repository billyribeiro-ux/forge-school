import { db } from '$lib/server/db';
import {
	filterActiveProducts,
	listActiveProductsWithPrices,
	listCategoriesWithProductCounts,
	type ProductFilters
} from '$lib/server/db/queries';
import type { ProductKindValue } from '$lib/server/db/schema';

const KINDS: readonly ProductKindValue[] = ['course', 'bundle', 'subscription', 'lifetime'];

function parseKind(raw: string | null): ProductKindValue | undefined {
	if (raw === null) return undefined;
	return KINDS.includes(raw as ProductKindValue) ? (raw as ProductKindValue) : undefined;
}

function parseMaxPrice(raw: string | null): number | undefined {
	if (raw === null || raw.trim() === '') return undefined;
	const n = Number(raw);
	if (!Number.isFinite(n) || n < 0) return undefined;
	return Math.round(n * 100);
}

export const load = async ({ url }) => {
	const kind = parseKind(url.searchParams.get('kind'));
	const rawCategory = url.searchParams.get('category') ?? '';
	const categorySlug = rawCategory === '' ? undefined : rawCategory;
	const maxPriceCents = parseMaxPrice(url.searchParams.get('maxPrice'));

	const filters: ProductFilters = {};
	if (kind !== undefined) filters.kind = kind;
	if (categorySlug !== undefined) filters.categorySlug = categorySlug;
	if (maxPriceCents !== undefined) filters.maxPriceCents = maxPriceCents;

	const hasFilters =
		filters.kind !== undefined ||
		filters.categorySlug !== undefined ||
		filters.maxPriceCents !== undefined;

	const [products, categories] = await Promise.all([
		hasFilters ? filterActiveProducts(db, filters) : listActiveProductsWithPrices(db),
		listCategoriesWithProductCounts(db)
	]);

	const featured = hasFilters
		? []
		: products
				.filter((p) => p.featuredOrder !== null)
				.sort((a, b) => (a.featuredOrder ?? 0) - (b.featuredOrder ?? 0));
	const all = products;
	return {
		featured,
		all,
		categories: categories.filter((c) => c.productCount > 0),
		filters: {
			kind: kind ?? null,
			categorySlug: categorySlug ?? null,
			maxPriceDollars: maxPriceCents === undefined ? null : maxPriceCents / 100
		},
		kinds: KINDS
	};
};
