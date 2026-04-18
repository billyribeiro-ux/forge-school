<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function formatPrice(cents: number, currency: string): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency.toUpperCase(),
			maximumFractionDigits: cents % 100 === 0 ? 0 : 2
		}).format(cents / 100);
	}

	function formatInterval(interval: string | null, count: number | null): string {
		if (interval === null || interval === 'one_time') return 'one-time';
		const every = count === null || count === 1 ? '' : `every ${count} `;
		return `${every}${interval}ly`.replace('monthy', 'monthly').replace('yearly', 'year');
	}
</script>

<svelte:head>
	<title>Pricing — ForgeSchool</title>
	<meta
		name="description"
		content="One-time, monthly, or yearly — pick the plan that fits how you learn."
	/>
</svelte:head>

<main class="pricing">
	<header class="hero">
		<p class="eyebrow">Pricing</p>
		<h1>One course. Three ways to pay.</h1>
		<p class="lede">
			Every plan unlocks every lesson and every future module. Pick the cadence that matches how
			you work.
		</p>
	</header>

	<section class="grid" aria-label="Plans">
		{#each data.products as product (product.id)}
			{@const primaryPrice = product.prices[0]}
			<article class="card" class:lifetime={product.kind === 'lifetime'}>
				<p class="kind">{product.kind === 'lifetime' ? 'Lifetime' : 'Subscription'}</p>
				<h2>{product.name}</h2>
				<p class="description">{product.description}</p>
				{#if primaryPrice !== undefined}
					<p class="price">
						<span class="amount">{formatPrice(primaryPrice.unitAmountCents, primaryPrice.currency)}</span>
						<span class="interval">{formatInterval(primaryPrice.interval, primaryPrice.intervalCount)}</span>
					</p>
					{#if primaryPrice.trialPeriodDays !== null}
						<p class="trial">{primaryPrice.trialPeriodDays}-day free trial</p>
					{/if}
					<form
						method="POST"
						action="/checkout/{product.slug}"
						class="checkout-form"
					>
						<input type="hidden" name="priceId" value={primaryPrice.id} />
						<button type="submit" class="cta">Start checkout</button>
					</form>
				{:else}
					<p class="no-price">Pricing coming soon</p>
				{/if}
			</article>
		{/each}
	</section>

	<footer class="footnote">
		<p>
			Prices are in USD. Stripe test mode uses card <code>4242 4242 4242 4242</code> with any
			future expiration and CVC <code>123</code>.
		</p>
	</footer>
</main>

<style>
	@layer components {
		.pricing {
			max-inline-size: 72rem;
			margin-inline: auto;
			padding-inline: 1.5rem;
			padding-block: 3rem;
		}

		.hero {
			text-align: center;
			margin-block-end: 3rem;
		}

		.eyebrow {
			font-size: var(--font-size-xs);
			letter-spacing: var(--letter-spacing-widest);
			text-transform: uppercase;
			color: var(--color-brand);
			font-weight: var(--font-weight-semibold);
		}

		.hero h1 {
			font-size: var(--font-size-4xl);
			margin-block: 1rem 1rem;
		}

		.lede {
			font-size: var(--font-size-lg);
			color: var(--color-fg-muted);
			max-inline-size: 40rem;
			margin-inline: auto;
		}

		.grid {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
			gap: 1rem;
		}

		.card {
			display: flex;
			flex-direction: column;
			gap: 0.75rem;
			padding: 2rem 1.5rem;
			border: 1px solid var(--color-border);
			border-radius: var(--radius-lg);
			background-color: var(--color-bg-raised);
		}

		.card.lifetime {
			border-color: var(--color-brand);
			box-shadow: 0 0 0 1px var(--color-brand);
		}

		.kind {
			font-size: var(--font-size-xs);
			letter-spacing: var(--letter-spacing-widest);
			text-transform: uppercase;
			color: var(--color-brand);
			font-weight: var(--font-weight-semibold);
		}

		.card h2 {
			font-size: var(--font-size-xl);
			margin: 0;
		}

		.description {
			color: var(--color-fg-muted);
			font-size: var(--font-size-sm);
			line-height: var(--line-height-relaxed);
		}

		.price {
			display: flex;
			align-items: baseline;
			gap: 0.5rem;
			margin-block-start: auto;
		}

		.amount {
			font-size: var(--font-size-3xl);
			font-weight: var(--font-weight-semibold);
			font-variant-numeric: tabular-nums;
		}

		.interval {
			font-size: var(--font-size-sm);
			color: var(--color-fg-muted);
		}

		.trial {
			font-size: var(--font-size-xs);
			color: var(--color-fg-subtle);
			font-variant-numeric: tabular-nums;
		}

		.checkout-form {
			margin-block-start: 0.5rem;
		}

		.cta {
			display: inline-flex;
			justify-content: center;
			align-items: center;
			width: 100%;
			padding-inline: 1rem;
			padding-block: 0.75rem;
			background-color: var(--color-brand);
			color: var(--color-brand-fg);
			border: 0;
			border-radius: var(--radius-md);
			font-weight: var(--font-weight-medium);
			cursor: pointer;
			transition: background-color var(--duration-fast) var(--easing-standard);
		}

		.cta:hover {
			background-color: var(--color-brand-hover);
		}

		.no-price {
			font-size: var(--font-size-sm);
			color: var(--color-fg-subtle);
			font-style: italic;
		}

		.footnote {
			margin-block-start: 3rem;
			padding-block-start: 2rem;
			border-block-start: 1px solid var(--color-border);
			text-align: center;
			font-size: var(--font-size-sm);
			color: var(--color-fg-muted);
		}
	}
</style>
