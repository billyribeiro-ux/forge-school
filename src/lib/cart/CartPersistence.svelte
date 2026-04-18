<!--
	CartPersistence — mounts once in the root layout, hydrates the cart
	from the `forge_cart` cookie on first client render, then observes
	cart mutations via $effect and writes back to the cookie.

	Renders nothing. Zero DOM. Effects never run during SSR, so the
	cookie I/O below is implicitly client-only — no `browser` guard
	needed.

	A small debounce (~150ms) coalesces rapid mutations — e.g., an
	add-to-cart click that bumps quantity twice in quick succession
	produces one cookie write, not two.
-->
<script lang="ts">
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

	// $effect never runs on the server, so no `browser` guard is needed.
	$effect(() => {
		if (hydrated) return;
		const existing = readCookie(CART_COOKIE_NAME);
		const items = deserializeCart(existing);
		if (items.length > 0) cart.hydrate(items);
		hydrated = true;
	});

	let writeTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		if (!hydrated) return;
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
