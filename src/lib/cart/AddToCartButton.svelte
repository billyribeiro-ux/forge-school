<!--
	AddToCartButton — single-price "add to cart" action.

	Pure UI: takes the product + price it's responsible for and pushes
	a CartLineItem into the reactive cart. Post-click disables briefly
	and flips its label so the student gets feedback that the click
	registered.
-->
<script lang="ts">
	import { track } from '$lib/analytics/events';
	import { useCart, type CartLineItem } from './cart.svelte';

	type Props = {
		priceId: string;
		productSlug: string;
		productName: string;
		unitAmountCents: number;
		currency: string;
	};

	let { priceId, productSlug, productName, unitAmountCents, currency }: Props = $props();

	const cart = useCart();
	let justAdded = $state(false);
	let resetTimer: ReturnType<typeof setTimeout> | null = null;

	function add(): void {
		const item: CartLineItem = {
			priceId,
			productSlug,
			productName,
			unitAmountCents,
			currency,
			quantity: 1
		};
		cart.add(item);
		track('add_to_cart', { productSlug });
		justAdded = true;
		if (resetTimer !== null) clearTimeout(resetTimer);
		resetTimer = setTimeout(() => {
			justAdded = false;
			resetTimer = null;
		}, 1200);
	}
</script>

<button type="button" class="add" onclick={add} disabled={justAdded}>
	{justAdded ? 'Added ✓' : 'Add to cart'}
</button>

<style>
	@layer components {
		.add {
			background-color: var(--color-bg-raised);
			color: var(--color-fg);
			border: 1px solid var(--color-border);
			padding-inline: 1rem;
			padding-block: 0.5rem;
			border-radius: var(--radius-md);
			font-weight: var(--font-weight-medium);
			cursor: pointer;
			transition:
				background-color var(--duration-fast) var(--easing-standard),
				border-color var(--duration-fast) var(--easing-standard);
		}
		.add:hover:not(:disabled) {
			border-color: var(--color-brand);
		}
		.add:disabled {
			background-color: var(--color-brand);
			color: var(--color-brand-fg);
			border-color: var(--color-brand);
			cursor: default;
		}
	}
</style>
