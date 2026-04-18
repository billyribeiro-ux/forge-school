<!--
	CartBadge — a tiny link to /cart with the current item count.

	Mounted in the root layout by consumers that want a persistent cart
	affordance (we'll mount it in the nav in Module 6). For now lesson
	071 uses it inline on /products and on the product detail page.
-->
<script lang="ts">
	import { useCart } from './cart.svelte';
	const cart = useCart();
</script>

<a href="/cart" class="badge" aria-label="Cart ({cart.quantity} items)">
	<span class="label">Cart</span>
	<span class="count">{cart.quantity}</span>
</a>

<style>
	@layer components {
		.badge {
			display: inline-flex;
			align-items: center;
			gap: 0.5rem;
			padding-inline: 0.9rem;
			padding-block: 0.4rem;
			border: 1px solid var(--color-border);
			border-radius: var(--radius-md);
			background-color: var(--color-bg-raised);
			color: var(--color-fg);
			text-decoration: none;
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
		}
		.badge:hover {
			border-color: var(--color-brand);
		}
		.count {
			font-variant-numeric: tabular-nums;
			background-color: var(--color-brand);
			color: var(--color-brand-fg);
			padding-inline: 0.45rem;
			padding-block: 0.05rem;
			border-radius: var(--radius-full);
			font-size: var(--font-size-xs);
			min-inline-size: 1.25rem;
			text-align: center;
		}
	}
</style>
