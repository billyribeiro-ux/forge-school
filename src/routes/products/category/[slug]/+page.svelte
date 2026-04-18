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
</script>

<svelte:head>
	<title>{data.category.name} — ForgeSchool</title>
	{#if data.category.description}
		<meta name="description" content={data.category.description} />
	{/if}
</svelte:head>

<main class="category">
	<nav class="breadcrumb"><a href="/products">← All products</a></nav>

	<header class="hero">
		<p class="eyebrow">Category</p>
		<h1>{data.category.name}</h1>
		{#if data.category.description}
			<p class="lede">{data.category.description}</p>
		{/if}
	</header>

	{#if data.products.length === 0}
		<p class="empty">No products in this category yet.</p>
	{:else}
		<ol class="grid">
			{#each data.products as product (product.id)}
				{@const price = product.prices[0]}
				<li class="card">
					<a href="/products/{product.slug}">
						<p class="kind">{product.kind}</p>
						<h3>{product.name}</h3>
						<p class="description">{product.description}</p>
						{#if price !== undefined}
							<p class="price">{formatPrice(price.unitAmountCents, price.currency)}</p>
						{/if}
					</a>
				</li>
			{/each}
		</ol>
	{/if}
</main>

<style>
	@layer components {
		.category {
			max-inline-size: 72rem;
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
		.hero {
			margin-block-end: 2.5rem;
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
			margin-block: 0.5rem 0.75rem;
		}
		.lede {
			color: var(--color-fg-muted);
		}
		.empty {
			color: var(--color-fg-muted);
		}
		.grid {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
			gap: 1rem;
			list-style: none;
			padding: 0;
		}
		.card {
			border: 1px solid var(--color-border);
			border-radius: var(--radius-lg);
			background-color: var(--color-bg-raised);
			transition: border-color var(--duration-fast) var(--easing-standard);
		}
		.card:hover {
			border-color: var(--color-brand);
		}
		.card a {
			display: block;
			padding: 1.25rem;
			color: var(--color-fg);
			text-decoration: none;
		}
		.kind {
			font-size: var(--font-size-xs);
			color: var(--color-brand);
			letter-spacing: var(--letter-spacing-wide);
			text-transform: uppercase;
		}
		.card h3 {
			font-size: var(--font-size-lg);
			margin-block: 0.25rem 0.5rem;
		}
		.description {
			font-size: var(--font-size-sm);
			color: var(--color-fg-muted);
			margin-block-end: 0.75rem;
		}
		.price {
			font-size: var(--font-size-xl);
			font-weight: var(--font-weight-semibold);
			font-variant-numeric: tabular-nums;
		}
	}
</style>
