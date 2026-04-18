/**
 * Pure cart arithmetic.
 *
 * Zero Svelte, zero DOM, zero runes — every function is a direct
 * minor-unit calculation against the item list. Lives in its own
 * module so unit tests (lesson 087) can target it without loading
 * the reactive cart store.
 *
 * All amounts are integer cents. Never introduce floats — rounding
 * drift compounds across line items and breaks Stripe reconciliation.
 */

export type CartLineItem = {
	priceId: string;
	productSlug: string;
	productName: string;
	unitAmountCents: number;
	currency: string;
	quantity: number;
};

export function lineItemTotalCents(item: CartLineItem): number {
	return item.unitAmountCents * item.quantity;
}

export function subtotalCents(items: readonly CartLineItem[]): number {
	let total = 0;
	for (const item of items) total += lineItemTotalCents(item);
	return total;
}

export function totalQuantity(items: readonly CartLineItem[]): number {
	let q = 0;
	for (const item of items) q += item.quantity;
	return q;
}

/**
 * Assert every item uses the same currency. The checkout session is
 * single-currency; a cart mixing USD and EUR cannot be handed off to
 * Stripe as one transaction.
 */
export function assertSingleCurrency(items: readonly CartLineItem[]): string | null {
	if (items.length === 0) return null;
	const first = items[0]?.currency;
	if (first === undefined) return null;
	for (const item of items) {
		if (item.currency !== first) {
			throw new Error(
				`Cart contains mixed currencies: "${first}" and "${item.currency}". Checkout requires a single currency.`
			);
		}
	}
	return first;
}

/**
 * Merge semantics: same priceId bumps quantity, different priceId
 * appends. Caller controls ordering.
 */
export function addOrIncrement(
	items: readonly CartLineItem[],
	incoming: CartLineItem
): CartLineItem[] {
	const idx = items.findIndex((it) => it.priceId === incoming.priceId);
	if (idx === -1) {
		return [...items, incoming];
	}
	const existing = items[idx];
	if (existing === undefined) return [...items, incoming];
	const merged: CartLineItem = { ...existing, quantity: existing.quantity + incoming.quantity };
	const next = items.slice();
	next[idx] = merged;
	return next;
}

export function setQuantity(
	items: readonly CartLineItem[],
	priceId: string,
	quantity: number
): CartLineItem[] {
	if (quantity <= 0) {
		return items.filter((it) => it.priceId !== priceId);
	}
	return items.map((it) => (it.priceId === priceId ? { ...it, quantity } : it));
}

export function removeItem(items: readonly CartLineItem[], priceId: string): CartLineItem[] {
	return items.filter((it) => it.priceId !== priceId);
}
