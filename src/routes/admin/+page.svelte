<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<header>
	<h1>Admin overview</h1>
	<p class="lede">Counts across the local database. Deep-link surfaces land when auth ships.</p>
</header>

<dl class="counts">
	<div>
		<dt>Products</dt>
		<dd>{data.counts.products}</dd>
	</div>
	<div>
		<dt>Coupons</dt>
		<dd>{data.counts.coupons}</dd>
	</div>
	<div>
		<dt>Orders</dt>
		<dd>{data.counts.orders}</dd>
	</div>
	<div>
		<dt>Subscriptions</dt>
		<dd>{data.counts.subscriptions}</dd>
	</div>
</dl>

<style>
	@layer components {
		header h1 {
			font-size: var(--font-size-3xl);
			margin: 0 0 0.25rem;
		}
		.lede {
			color: var(--color-fg-muted);
			margin-block-end: 1.5rem;
		}
		.counts {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
			gap: 1rem;
			margin: 0;
		}
		.counts div {
			padding: 1rem;
			border: 1px solid var(--color-border);
			border-radius: var(--radius-md);
			background-color: var(--color-bg-raised);
		}
		dt {
			font-size: var(--font-size-xs);
			letter-spacing: var(--letter-spacing-widest);
			text-transform: uppercase;
			color: var(--color-fg-muted);
			margin-block-end: 0.25rem;
		}
		dd {
			font-size: var(--font-size-2xl);
			font-weight: var(--font-weight-bold);
			font-variant-numeric: tabular-nums;
			margin: 0;
		}
	}
</style>
