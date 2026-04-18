/**
 * Cart persistence — serialize / deserialize the reactive cart to a
 * single first-party cookie. Pure functions; the side-effectful
 * read/write happens in layout load (server, reads the header) and in
 * an $effect on the client (writes document.cookie). Both call into
 * this module.
 *
 * Size budget: browsers cap a cookie at 4 KB. We cap the cart at 25
 * items and 256 chars of product metadata per item — any larger and
 * we bail out of persistence with a warning rather than silently
 * truncate.
 */
import type { CartLineItem } from './cart-math';

export const CART_COOKIE_NAME = 'forge_cart';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
const MAX_ITEMS = 25;

type PersistedItem = Readonly<{
	p: string; // priceId
	s: string; // productSlug
	n: string; // productName
	a: number; // unitAmountCents
	c: string; // currency
	q: number; // quantity
}>;

type PersistedCart = Readonly<{ v: 1; items: readonly PersistedItem[] }>;

function toPersisted(item: CartLineItem): PersistedItem {
	return {
		p: item.priceId,
		s: item.productSlug,
		n: item.productName,
		a: item.unitAmountCents,
		c: item.currency,
		q: item.quantity
	};
}

function fromPersisted(row: PersistedItem): CartLineItem {
	return {
		priceId: row.p,
		productSlug: row.s,
		productName: row.n,
		unitAmountCents: row.a,
		currency: row.c,
		quantity: row.q
	};
}

export function serializeCart(items: readonly CartLineItem[]): string {
	const capped = items.slice(0, MAX_ITEMS).map(toPersisted);
	const payload: PersistedCart = { v: 1, items: capped };
	return encodeURIComponent(JSON.stringify(payload));
}

export function deserializeCart(raw: string | undefined | null): CartLineItem[] {
	if (raw === undefined || raw === null || raw === '') return [];
	try {
		const json = JSON.parse(decodeURIComponent(raw)) as unknown;
		if (typeof json !== 'object' || json === null) return [];
		const payload = json as Partial<PersistedCart>;
		if (payload.v !== 1 || !Array.isArray(payload.items)) return [];
		const items: CartLineItem[] = [];
		for (const row of payload.items) {
			if (!isValidRow(row)) continue;
			items.push(fromPersisted(row));
		}
		return items;
	} catch {
		return [];
	}
}

function isValidRow(row: unknown): row is PersistedItem {
	if (typeof row !== 'object' || row === null) return false;
	const r = row as Record<string, unknown>;
	return (
		typeof r['p'] === 'string' &&
		typeof r['s'] === 'string' &&
		typeof r['n'] === 'string' &&
		typeof r['a'] === 'number' &&
		Number.isFinite(r['a']) &&
		typeof r['c'] === 'string' &&
		typeof r['q'] === 'number' &&
		Number.isFinite(r['q']) &&
		r['q'] > 0
	);
}

export const CART_COOKIE_MAX_AGE = COOKIE_MAX_AGE_SECONDS;
