<script lang="ts">
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<title>Admin — ForgeSchool</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="admin-shell">
	<div class="dev-banner" role="status">
		<strong>DEV MODE</strong>
		— this shell is not production-ready and is unconditionally 404 in production.
	</div>
	<div class="grid">
		<aside class="sidebar" aria-label="Admin sections">
			<a href="/admin">Overview</a>
			<span class="stub">Products</span>
			<span class="stub">Coupons</span>
			<span class="stub">Orders</span>
			<span class="stub">Subscriptions</span>
		</aside>
		<main class="content">
			{@render children()}
		</main>
	</div>
</div>

<style>
	@layer components {
		.admin-shell {
			max-inline-size: 80rem;
			margin-inline: auto;
			padding-inline: 1.5rem;
			padding-block: 1.5rem;
		}
		.dev-banner {
			padding: 0.6rem 1rem;
			background-color: var(--color-warning-50, var(--color-bg-sunken));
			color: var(--color-warning-700, var(--color-fg));
			border: 1px solid var(--color-warning-200, var(--color-border));
			border-radius: var(--radius-md);
			font-size: var(--font-size-sm);
			margin-block-end: 1rem;
		}
		.grid {
			display: grid;
			grid-template-columns: 14rem 1fr;
			gap: 1.5rem;
		}
		.sidebar {
			display: grid;
			gap: 0.25rem;
			align-content: start;
		}
		.sidebar a,
		.sidebar .stub {
			padding: 0.5rem 0.75rem;
			border-radius: var(--radius-md);
			color: var(--color-fg);
			text-decoration: none;
			font-size: var(--font-size-sm);
		}
		.sidebar a:hover {
			background-color: var(--color-bg-raised);
		}
		.sidebar .stub {
			color: var(--color-fg-subtle);
			font-style: italic;
		}
		.content {
			min-inline-size: 0;
		}
	}
</style>
