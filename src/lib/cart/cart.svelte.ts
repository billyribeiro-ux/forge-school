/**
 * Reactive cart store — Svelte 5 runes, module-scoped singleton.
 *
 * Exposed as a factory that returns the singleton on first call;
 * subsequent imports reuse the same reactive state. Consumers write
 * `const cart = useCart();` then read `cart.items` / `cart.subtotalCents`
 * directly in markup — every access is tracked by the Svelte 5
 * reactivity system via the `$state` rune on `items`.
 *
 * Persistence is a separate concern wired in lesson 070. This module
 * is pure client state.
 */
import {
	addOrIncrement,
	assertSingleCurrency,
	type CartLineItem,
	removeItem,
	setQuantity,
	subtotalCents,
	totalQuantity
} from './cart-math';

export type { CartLineItem } from './cart-math';

export type Cart = {
	readonly items: readonly CartLineItem[];
	readonly subtotalCents: number;
	readonly quantity: number;
	readonly currency: string | null;
	add(item: CartLineItem): void;
	setQuantity(priceId: string, quantity: number): void;
	remove(priceId: string): void;
	clear(): void;
	hydrate(items: readonly CartLineItem[]): void;
};

function createCart(): Cart {
	const state = $state<{ items: CartLineItem[] }>({ items: [] });

	return {
		get items() {
			return state.items;
		},
		get subtotalCents() {
			return subtotalCents(state.items);
		},
		get quantity() {
			return totalQuantity(state.items);
		},
		get currency() {
			return assertSingleCurrency(state.items);
		},
		add(item) {
			state.items = addOrIncrement(state.items, item);
		},
		setQuantity(priceId, quantity) {
			state.items = setQuantity(state.items, priceId, quantity);
		},
		remove(priceId) {
			state.items = removeItem(state.items, priceId);
		},
		clear() {
			state.items = [];
		},
		hydrate(items) {
			state.items = [...items];
		}
	};
}

let singleton: Cart | null = null;

export function useCart(): Cart {
	if (singleton === null) singleton = createCart();
	return singleton;
}

/** Test-only — reset the singleton between test cases. */
export function __resetCartSingleton(): void {
	singleton = null;
}
