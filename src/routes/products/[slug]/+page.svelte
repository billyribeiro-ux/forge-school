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

	function formatInterval(interval: string | null): string {
		if (interval === null || interval === 'one_time') return 'one-time';
		if (interval === 'month') return 'per month';
		return 'per year';
	}
</script>

<svelte:head>
	<title>{data.product.name} — ForgeSchool</title>
	<meta name="description" content={data.product.description ?? ''} />
</svelte:head>

<main class="product-page">
	<nav class="breadcrumb"><a href="/products">← All products</a></nav>

	<article>
		<header>
			<p class="kind">{data.product.kind}</p>
			<h1>{data.product.name}</h1>
			{#if data.product.description}
				<p class="description">{data.product.description}</p>
			{/if}
			{#if data.product.tags.length > 0}
				<ul class="tags">
					{#each data.product.tags as tag (tag)}
						<li class="tag">{tag}</li>
					{/each}
				</ul>
			{/if}
		</header>

		<section class="prices" aria-labelledby="prices-heading">
			<h2 id="prices-heading">Available plans</h2>
			<ol class="price-list">
				{#each data.prices as price (price.id)}
					<li class="price-row">
						<div class="price-info">
							<p class="amount">
								{formatPrice(price.unitAmountCents, price.currency)}
								<span class="interval">{formatInterval(price.interval)}</span>
							</p>
							{#if price.trialPeriodDays !== null}
								<p class="trial">{price.trialPeriodDays}-day free trial</p>
							{/if}
						</div>
						<form method="POST" action="/checkout/{data.product.slug}">
							<input type="hidden" name="priceId" value={price.id} />
							<button type="submit" class="cta">Start checkout</button>
						</form>
					</li>
				{/each}
			</ol>
		</section>
	</article>
</main>

<style>
	@layer components {
		.product-page {
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
		.kind {
			font-size: var(--font-size-xs);
			letter-spacing: var(--letter-spacing-widest);
			text-transform: uppercase;
			color: var(--color-brand);
			font-weight: var(--font-weight-semibold);
		}
		h1 {
			font-size: var(--font-size-4xl);
			margin-block: 0.5rem 1rem;
		}
		.description {
			font-size: var(--font-size-lg);
			color: var(--color-fg-muted);
			line-height: var(--line-height-relaxed);
			margin-block-end: 1rem;
		}
		.tags {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
			list-style: none;
			padding: 0;
			margin-block-end: 2rem;
		}
		.tag {
			font-size: var(--font-size-xs);
			padding-inline: 0.6rem;
			padding-block: 0.2rem;
			background-color: var(--color-bg-sunken);
			border-radius: var(--radius-sm);
		}
		.prices {
			border-block-start: 1px solid var(--color-border);
			padding-block-start: 1.5rem;
			margin-block-start: 2rem;
		}
		.prices h2 {
			font-size: var(--font-size-lg);
			margin-block-end: 1rem;
		}
		.price-list {
			list-style: none;
			padding: 0;
			display: grid;
			gap: 0.75rem;
		}
		.price-row {
			display: flex;
			justify-content: space-between;
			align-items: center;
			gap: 1rem;
			padding: 1rem;
			border: 1px solid var(--color-border);
			border-radius: var(--radius-md);
		}
		.amount {
			font-size: var(--font-size-xl);
			font-weight: var(--font-weight-semibold);
			font-variant-numeric: tabular-nums;
		}
		.interval {
			font-size: var(--font-size-sm);
			color: var(--color-fg-muted);
			font-weight: var(--font-weight-regular);
		}
		.trial {
			font-size: var(--font-size-xs);
			color: var(--color-fg-subtle);
		}
		.cta {
			background-color: var(--color-brand);
			color: var(--color-brand-fg);
			border: 0;
			padding-inline: 1rem;
			padding-block: 0.6rem;
			border-radius: var(--radius-md);
			font-weight: var(--font-weight-medium);
			cursor: pointer;
		}
		.cta:hover {
			background-color: var(--color-brand-hover);
		}
	}
</style>
