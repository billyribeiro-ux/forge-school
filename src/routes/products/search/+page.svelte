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
	<title>
		{data.q === '' ? 'Search' : `"${data.q}"`} — ForgeSchool
	</title>
</svelte:head>

<main class="search">
	<nav class="breadcrumb"><a href="/products">← All products</a></nav>

	<header class="hero">
		<p class="eyebrow">Search</p>
		<h1>Find a product</h1>
	</header>

	<form class="search-form" method="GET" role="search">
		<label for="q" class="sr-only">Search query</label>
		<input
			id="q"
			name="q"
			type="search"
			value={data.q}
			placeholder="e.g. lifetime, monthly, stripe"
			autocomplete="off"
		/>
		<button type="submit">Search</button>
	</form>

	{#if data.q !== ''}
		<p class="result-count">
			{data.results.length}
			{data.results.length === 1 ? 'result' : 'results'} for <strong>"{data.q}"</strong>
		</p>
	{/if}

	{#if data.results.length > 0}
		<ol class="grid">
			{#each data.results as product (product.id)}
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
	{:else if data.q !== ''}
		<p class="empty">No products match that query.</p>
	{/if}
</main>

<style>
	@layer components {
		.search {
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
			margin-block-end: 1.5rem;
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
		.search-form {
			display: flex;
			gap: 0.5rem;
			margin-block-end: 1.5rem;
		}
		.search-form input {
			flex: 1;
			padding-inline: 0.9rem;
			padding-block: 0.6rem;
			border: 1px solid var(--color-border);
			border-radius: var(--radius-md);
			background-color: var(--color-bg-raised);
			color: var(--color-fg);
			font-size: var(--font-size-base);
		}
		.search-form input:focus-visible {
			outline: 2px solid var(--color-brand);
			outline-offset: 2px;
		}
		.search-form button {
			padding-inline: 1.2rem;
			background-color: var(--color-brand);
			color: var(--color-brand-fg);
			border: 0;
			border-radius: var(--radius-md);
			font-weight: var(--font-weight-medium);
			cursor: pointer;
		}
		.search-form button:hover {
			background-color: var(--color-brand-hover);
		}
		.result-count {
			color: var(--color-fg-muted);
			margin-block-end: 1rem;
		}
		.empty {
			color: var(--color-fg-muted);
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
