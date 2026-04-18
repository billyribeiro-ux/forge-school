<!--
	CartPersistence — mounts once in the root layout, hydrates the cart
	from the `forge_cart` cookie on first client render, then observes
	cart mutations via $effect and writes back to the cookie.

	Renders nothing. Zero DOM. Server-side: the cookie is already set
	by a previous response; this component runs client-side only (the
	`{#if browser}` guard in the wrapper keeps SSR inert).

	A small debounce (~150ms) coalesces rapid mutations — e.g., an
	add-to-cart click that bumps quantity twice in quick succession
	produces one cookie write, not two.
-->
<script lang="ts">
	import { browser } from '$app/environment';
	import { useCart } from './cart.svelte';
	import {
		CART_COOKIE_MAX_AGE,
		CART_COOKIE_NAME,
		deserializeCart,
		serializeCart
	} from './cart-persistence';

	const cart = useCart();
	let hydrated = $state(false);

	function readCookie(name: string): string | undefined {
		for (const raw of document.cookie.split('; ')) {
			const eq = raw.indexOf('=');
			if (eq === -1) continue;
			const key = raw.slice(0, eq);
			if (key === name) return raw.slice(eq + 1);
		}
		return undefined;
	}

	function writeCookie(value: string): void {
		const secure = location.protocol === 'https:' ? '; Secure' : '';
		document.cookie = `${CART_COOKIE_NAME}=${value}; Path=/; Max-Age=${CART_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
	}

	$effect(() => {
		if (!browser || hydrated) return;
		const existing = readCookie(CART_COOKIE_NAME);
		const items = deserializeCart(existing);
		if (items.length > 0) cart.hydrate(items);
		hydrated = true;
	});

	let writeTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		if (!browser || !hydrated) return;
		const snapshot = cart.items;
		if (writeTimer !== null) clearTimeout(writeTimer);
		writeTimer = setTimeout(() => {
			writeCookie(serializeCart(snapshot));
		}, 150);
		return () => {
			if (writeTimer !== null) {
				clearTimeout(writeTimer);
				writeTimer = null;
			}
		};
	});
</script>
