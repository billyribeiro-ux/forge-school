<script lang="ts">
	import { track } from '$lib/analytics/events';
	import { useCart } from '$lib/cart/cart.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const cart = useCart();

	const applied = $derived(data.appliedCoupon);
	const discount = $derived(applied?.discountCents ?? 0);
	const totalAfterDiscount = $derived(Math.max(0, cart.subtotalCents - discount));

	let lastTrackedCoupon = $state<string | null>(null);
	$effect(() => {
		if (applied !== null && applied.code !== lastTrackedCoupon) {
			track('coupon_applied', { code: applied.code });
			lastTrackedCoupon = applied.code;
		}
	});

	function trackCheckoutStarted(): void {
		track('checkout_started', {
			itemCount: String(cart.items.length),
			subtotalCents: String(cart.subtotalCents)
		});
	}

	function formatPrice(cents: number, currency: string): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency.toUpperCase(),
			maximumFractionDigits: cents % 100 === 0 ? 0 : 2
		}).format(cents / 100);
	}

	function onQuantityInput(priceId: string, event: Event): void {
		const target = event.currentTarget as HTMLInputElement;
		const next = Number(target.value);
		if (!Number.isFinite(next)) return;
		cart.setQuantity(priceId, Math.max(0, Math.trunc(next)));
	}
</script>

<svelte:head>
	<title>Your cart — ForgeSchool</title>
</svelte:head>

<main class="cart-page">
	<nav class="breadcrumb"><a href="/products">← Keep browsing</a></nav>

	<header>
		<h1>Your cart</h1>
	</header>

	{#if cart.items.length === 0}
		<p class="empty">
			Your cart is empty. <a href="/products">Browse the catalog →</a>
		</p>
	{:else}
		<ol class="items">
			{#each cart.items as item (item.priceId)}
				<li class="row">
					<div class="meta">
						<a class="name" href="/products/{item.productSlug}">{item.productName}</a>
						<p class="unit">{formatPrice(item.unitAmountCents, item.currency)} each</p>
					</div>
					<label class="qty">
						<span class="sr-only">Quantity for {item.productName}</span>
						<input
							type="number"
							min="0"
							step="1"
							value={item.quantity}
							oninput={(e) => onQuantityInput(item.priceId, e)}
						/>
					</label>
					<p class="line">{formatPrice(item.unitAmountCents * item.quantity, item.currency)}</p>
					<button
						type="button"
						class="remove"
						onclick={() => cart.remove(item.priceId)}
						aria-label="Remove {item.productName}"
					>
						Remove
					</button>
				</li>
			{/each}
		</ol>

		<section class="coupon" aria-labelledby="coupon-heading">
			<h2 id="coupon-heading">Coupon</h2>
			{#if applied === null}
				<form method="POST" action="?/apply" class="coupon-form">
					<label>
						<span class="sr-only">Coupon code</span>
						<input
							name="code"
							type="text"
							autocomplete="off"
							placeholder="Enter a code"
							value={form?.code ?? ''}
						/>
					</label>
					<button type="submit">Apply</button>
				</form>
				{#if form?.couponError !== undefined}
					<p class="coupon-error" role="alert">{form.couponError}</p>
				{/if}
			{:else}
				<div class="coupon-applied">
					<span>
						<strong>{applied.code}</strong>
						applied —
						{applied.discountType === 'percent'
							? `${applied.discountValue}% off`
							: `${formatPrice(applied.discountValue, cart.currency ?? 'usd')} off`}
					</span>
					<form method="POST" action="?/remove">
						<button type="submit" class="link">Remove</button>
					</form>
				</div>
			{/if}
			{#if data.couponError !== undefined}
				<p class="coupon-error" role="alert">{data.couponError}</p>
			{/if}
		</section>

		<footer class="summary">
			<dl>
				<dt>Subtotal</dt>
				<dd>
					{formatPrice(cart.subtotalCents, cart.currency ?? 'usd')}
				</dd>
			</dl>
			{#if discount > 0}
				<dl class="discount-row">
					<dt>Discount</dt>
					<dd>−{formatPrice(discount, cart.currency ?? 'usd')}</dd>
				</dl>
				<dl class="total-row">
					<dt>Total</dt>
					<dd>{formatPrice(totalAfterDiscount, cart.currency ?? 'usd')}</dd>
				</dl>
			{/if}
			<p class="summary-note">Taxes are calculated at checkout.</p>
			<div class="actions">
				<button type="button" class="secondary" onclick={() => cart.clear()}>Clear cart</button>
				<form method="POST" action="/cart/checkout" onsubmit={trackCheckoutStarted}>
					<button type="submit" class="primary">Checkout →</button>
				</form>
			</div>
		</footer>
	{/if}
</main>

<style>
	@layer components {
		.cart-page {
			max-inline-size: 52rem;
			margin-inline: auto;
			padding-inline: 1.5rem;
			padding-block: 3rem;
		}
		.breadcrumb {
			margin-block-end: 2rem;
			font-size: var(--font-size-sm);
		}
		.breadcrumb a {
			color: var(--color-fg-muted);
		}
		h1 {
			font-size: var(--font-size-4xl);
			margin-block: 0 1.5rem;
		}
		.empty {
			color: var(--color-fg-muted);
		}
		.items {
			list-style: none;
			padding: 0;
			display: grid;
			gap: 0.75rem;
			margin-block-end: 2rem;
		}
		.row {
			display: grid;
			grid-template-columns: 1fr auto auto auto;
			align-items: center;
			gap: 1rem;
			padding: 1rem;
			border: 1px solid var(--color-border);
			border-radius: var(--radius-md);
			background-color: var(--color-bg-raised);
		}
		.name {
			color: var(--color-fg);
			font-weight: var(--font-weight-medium);
			text-decoration: none;
		}
		.name:hover {
			color: var(--color-brand);
		}
		.unit {
			font-size: var(--font-size-sm);
			color: var(--color-fg-muted);
			margin: 0;
		}
		.qty input {
			inline-size: 4.5rem;
			padding-inline: 0.5rem;
			padding-block: 0.3rem;
			border: 1px solid var(--color-border);
			border-radius: var(--radius-sm);
			text-align: right;
			font-variant-numeric: tabular-nums;
			background-color: var(--color-bg);
			color: var(--color-fg);
		}
		.line {
			font-variant-numeric: tabular-nums;
			font-weight: var(--font-weight-semibold);
			margin: 0;
			min-inline-size: 5rem;
			text-align: right;
		}
		.remove {
			background: transparent;
			border: 0;
			color: var(--color-fg-muted);
			cursor: pointer;
			font-size: var(--font-size-sm);
			padding-inline: 0.5rem;
		}
		.remove:hover {
			color: var(--color-brand);
		}
		.summary {
			border-block-start: 1px solid var(--color-border);
			padding-block-start: 1.5rem;
		}
		.summary dl {
			display: flex;
			justify-content: space-between;
			align-items: baseline;
			margin: 0 0 0.5rem;
		}
		.summary dt {
			font-size: var(--font-size-lg);
			font-weight: var(--font-weight-semibold);
		}
		.summary dd {
			font-size: var(--font-size-2xl);
			font-weight: var(--font-weight-semibold);
			font-variant-numeric: tabular-nums;
			margin: 0;
		}
		.summary-note {
			font-size: var(--font-size-sm);
			color: var(--color-fg-muted);
			margin-block-end: 1.5rem;
		}
		.actions {
			display: flex;
			gap: 0.75rem;
			justify-content: flex-end;
		}
		.primary {
			background-color: var(--color-brand);
			color: var(--color-brand-fg);
			padding-inline: 1.25rem;
			padding-block: 0.6rem;
			border-radius: var(--radius-md);
			font-weight: var(--font-weight-medium);
			text-decoration: none;
			border: 0;
			cursor: pointer;
		}
		.primary:hover {
			background-color: var(--color-brand-hover);
		}
		.secondary {
			background: transparent;
			border: 1px solid var(--color-border);
			color: var(--color-fg-muted);
			padding-inline: 1rem;
			padding-block: 0.55rem;
			border-radius: var(--radius-md);
			cursor: pointer;
		}
		.secondary:hover {
			color: var(--color-fg);
			border-color: var(--color-brand);
		}
		.coupon {
			border-block-start: 1px solid var(--color-border);
			padding-block-start: 1.5rem;
			margin-block: 1.5rem;
		}
		.coupon h2 {
			font-size: var(--font-size-base);
			margin: 0 0 0.75rem;
		}
		.coupon-form {
			display: flex;
			gap: 0.5rem;
		}
		.coupon-form input {
			flex: 1;
			padding-inline: 0.75rem;
			padding-block: 0.5rem;
			border: 1px solid var(--color-border);
			border-radius: var(--radius-md);
			background-color: var(--color-bg);
			color: var(--color-fg);
			text-transform: uppercase;
			letter-spacing: var(--letter-spacing-wide);
		}
		.coupon-form button {
			padding-inline: 1.1rem;
			padding-block: 0.5rem;
			background-color: var(--color-bg-raised);
			color: var(--color-fg);
			border: 1px solid var(--color-border);
			border-radius: var(--radius-md);
			cursor: pointer;
		}
		.coupon-form button:hover {
			border-color: var(--color-brand);
		}
		.coupon-applied {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin: 0;
			color: var(--color-fg);
		}
		.coupon-applied .link {
			background: transparent;
			border: 0;
			color: var(--color-fg-muted);
			font-size: var(--font-size-sm);
			cursor: pointer;
			padding: 0.25rem 0.5rem;
		}
		.coupon-applied .link:hover {
			color: var(--color-brand);
		}
		.coupon-error {
			color: var(--color-danger, var(--color-brand));
			font-size: var(--font-size-sm);
			margin-block-start: 0.5rem;
		}
		.discount-row dd {
			color: var(--color-fg-muted);
		}
		.total-row dt {
			font-weight: var(--font-weight-bold);
		}
		.total-row dd {
			font-weight: var(--font-weight-bold);
		}
		.sr-only {
			position: absolute;
			inline-size: 1px;
			block-size: 1px;
			padding: 0;
			margin: -1px;
			overflow: hidden;
			clip: rect(0, 0, 0, 0);
			white-space: nowrap;
			border-width: 0;
		}
	}
</style>
