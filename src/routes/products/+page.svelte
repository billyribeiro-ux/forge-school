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
	<title>Products — ForgeSchool</title>
</svelte:head>

<main class="catalog">
	<header class="hero">
		<p class="eyebrow">Catalog</p>
		<h1>Every ForgeSchool product</h1>
		<p class="lede">Browse by kind — lifetime courses, subscription plans, bundles.</p>
		<p class="hero-actions">
			<a class="search-link" href="/products/search">Search products →</a>
		</p>
	</header>

	{#if data.categories.length > 0}
		<section class="categories" aria-labelledby="browse-heading">
			<h2 id="browse-heading">Browse by category</h2>
			<ul class="category-strip">
				{#each data.categories as category (category.id)}
					<li>
						<a href="/products/category/{category.slug}">
							<span class="cat-name">{category.name}</span>
							<span class="cat-count">{category.productCount}</span>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if data.featured.length > 0}
		<section class="featured">
			<h2>Featured</h2>
			<ol class="grid">
				{#each data.featured as product (product.id)}
					{@const price = product.prices[0]}
					<li class="card featured-card">
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
		</section>
	{/if}

	<section class="all">
		<h2>All products</h2>
		<ol class="grid">
			{#each data.all as product (product.id)}
				{@const price = product.prices[0]}
				<li class="card">
					<a href="/products/{product.slug}">
						<p class="kind">{product.kind}</p>
						<h3>{product.name}</h3>
						<p class="description">{product.description}</p>
						{#if price !== undefined}
							<p class="price">{formatPrice(price.unitAmountCents, price.currency)}</p>
						{/if}
						{#if product.tags.length > 0}
							<ul class="tags">
								{#each product.tags as tag (tag)}
									<li class="tag">{tag}</li>
								{/each}
							</ul>
						{/if}
					</a>
				</li>
			{/each}
		</ol>
	</section>
</main>

<style>
	@layer components {
		.catalog {
			max-inline-size: 72rem;
			margin-inline: auto;
			padding-inline: 1.5rem;
			padding-block: 3rem;
		}
		.hero {
			margin-block-end: 2.5rem;
			text-align: center;
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
		.hero-actions {
			margin-block-start: 1rem;
		}
		.search-link {
			color: var(--color-brand);
			font-weight: var(--font-weight-medium);
		}
		section {
			margin-block-end: 2.5rem;
		}
		section h2 {
			font-size: var(--font-size-2xl);
			margin-block-end: 1rem;
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
		.featured-card {
			box-shadow: 0 0 0 1px var(--color-brand);
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
		.tags {
			display: flex;
			flex-wrap: wrap;
			gap: 0.25rem;
			list-style: none;
			padding: 0;
			margin-block-start: 0.5rem;
		}
		.tag {
			font-size: var(--font-size-xs);
			padding-inline: 0.5rem;
			padding-block: 0.15rem;
			background-color: var(--color-bg-sunken);
			border-radius: var(--radius-sm);
			color: var(--color-fg-muted);
		}
		.category-strip {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
			list-style: none;
			padding: 0;
		}
		.category-strip a {
			display: inline-flex;
			align-items: center;
			gap: 0.5rem;
			padding-inline: 0.9rem;
			padding-block: 0.5rem;
			border: 1px solid var(--color-border);
			border-radius: var(--radius-md);
			color: var(--color-fg);
			text-decoration: none;
			background-color: var(--color-bg-raised);
			transition: border-color var(--duration-fast) var(--easing-standard);
		}
		.category-strip a:hover {
			border-color: var(--color-brand);
		}
		.cat-count {
			font-size: var(--font-size-xs);
			font-variant-numeric: tabular-nums;
			color: var(--color-fg-muted);
			background-color: var(--color-bg-sunken);
			padding-inline: 0.4rem;
			padding-block: 0.1rem;
			border-radius: var(--radius-sm);
		}
	}
</style>
