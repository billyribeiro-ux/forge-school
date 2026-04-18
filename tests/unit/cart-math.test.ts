import { describe, expect, it } from 'vitest';
import {
	addOrIncrement,
	assertSingleCurrency,
	type CartLineItem,
	lineItemTotalCents,
	removeItem,
	setQuantity,
	subtotalCents,
	totalQuantity
} from '../../src/lib/cart/cart-math.ts';

function makeItem(over: Partial<CartLineItem> = {}): CartLineItem {
	return {
		priceId: 'price_1',
		productSlug: 'forgeschool-lifetime',
		productName: 'ForgeSchool Lifetime',
		unitAmountCents: 49700,
		currency: 'usd',
		quantity: 1,
		...over
	};
}

describe('cart-math', () => {
	describe('lineItemTotalCents', () => {
		it('multiplies unit amount by quantity', () => {
			expect(lineItemTotalCents(makeItem({ unitAmountCents: 2500, quantity: 3 }))).toBe(7500);
		});
		it('returns 0 when quantity is 0', () => {
			expect(lineItemTotalCents(makeItem({ quantity: 0 }))).toBe(0);
		});
	});

	describe('subtotalCents', () => {
		it('sums line items', () => {
			const items = [
				makeItem({ priceId: 'p1', unitAmountCents: 1000, quantity: 2 }),
				makeItem({ priceId: 'p2', unitAmountCents: 500, quantity: 1 })
			];
			expect(subtotalCents(items)).toBe(2500);
		});
		it('is 0 for an empty cart', () => {
			expect(subtotalCents([])).toBe(0);
		});
	});

	describe('totalQuantity', () => {
		it('sums quantities', () => {
			expect(
				totalQuantity([makeItem({ quantity: 2 }), makeItem({ priceId: 'p2', quantity: 3 })])
			).toBe(5);
		});
	});

	describe('assertSingleCurrency', () => {
		it('returns the currency when all items match', () => {
			expect(assertSingleCurrency([makeItem({ currency: 'usd' })])).toBe('usd');
		});
		it('returns null for empty cart', () => {
			expect(assertSingleCurrency([])).toBeNull();
		});
		it('throws on mixed currencies', () => {
			expect(() =>
				assertSingleCurrency([
					makeItem({ priceId: 'p1', currency: 'usd' }),
					makeItem({ priceId: 'p2', currency: 'eur' })
				])
			).toThrow(/mixed currencies/);
		});
	});

	describe('addOrIncrement', () => {
		it('appends a new line item', () => {
			const next = addOrIncrement([], makeItem());
			expect(next).toHaveLength(1);
		});
		it('merges quantity for duplicate priceId', () => {
			const first = makeItem({ quantity: 1 });
			const second = makeItem({ quantity: 2 });
			const next = addOrIncrement([first], second);
			expect(next).toHaveLength(1);
			expect(next[0]?.quantity).toBe(3);
		});
		it('returns a new array (does not mutate input)', () => {
			const items: readonly CartLineItem[] = [makeItem()];
			const next = addOrIncrement(items, makeItem({ priceId: 'p2' }));
			expect(next).not.toBe(items);
			expect(items).toHaveLength(1);
		});
	});

	describe('setQuantity', () => {
		it('updates quantity on match', () => {
			const items = [makeItem({ quantity: 1 })];
			expect(setQuantity(items, 'price_1', 5)[0]?.quantity).toBe(5);
		});
		it('removes the item when quantity <= 0', () => {
			const items = [makeItem({ quantity: 1 })];
			expect(setQuantity(items, 'price_1', 0)).toHaveLength(0);
		});
		it('is a no-op when priceId does not match', () => {
			const items = [makeItem({ quantity: 1 })];
			const next = setQuantity(items, 'nope', 99);
			expect(next[0]?.quantity).toBe(1);
		});
	});

	describe('removeItem', () => {
		it('filters out the matching priceId', () => {
			const items = [makeItem({ priceId: 'p1' }), makeItem({ priceId: 'p2' })];
			expect(removeItem(items, 'p1')).toHaveLength(1);
			expect(removeItem(items, 'p1')[0]?.priceId).toBe('p2');
		});
		it('is a no-op when priceId does not match', () => {
			const items = [makeItem()];
			expect(removeItem(items, 'nope')).toHaveLength(1);
		});
	});
});
