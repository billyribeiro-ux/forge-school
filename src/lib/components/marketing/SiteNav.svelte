<!--
	SiteNav — scroll-aware, Motion-subtle site navigation.

	Auto-hides shadow + translucent background until scrolled > 8px, then
	adds both. Respects `prefers-reduced-motion`: transitions are disabled
	under the media query.

	Zero layout shift on hydration — renders identically server + client,
	only the `scrolled` class toggles post-mount.
-->
<script lang="ts">
	let scrolled = $state(false);

	function onScroll(): void {
		scrolled = window.scrollY > 8;
	}
</script>

<svelte:window onscroll={onScroll} />

<nav class={['site-nav', { scrolled }]} aria-label="Primary">
	<a class="brand" href="/">
		<span class="mark" aria-hidden="true">◆</span>
		<span class="brand-text">ForgeSchool</span>
	</a>
	<ul class="links">
		<li><a href="/lessons">Curriculum</a></li>
		<li><a href="/products">Products</a></li>
		<li><a href="/pricing">Pricing</a></li>
		<li><a href="/about">About</a></li>
	</ul>
	<div class="actions">
		<a class="action secondary" href="/cart" aria-label="Cart">Cart</a>
		<a class="action primary" href="/pricing">Get access</a>
	</div>
</nav>

<style>
	@layer components {
		.site-nav {
			position: sticky;
			inset-block-start: 0;
			z-index: 10;
			display: flex;
			align-items: center;
			gap: 2rem;
			padding-inline: 1.5rem;
			padding-block: 0.75rem;
			background-color: color-mix(in oklch, var(--color-bg) 80%, transparent);
			backdrop-filter: blur(8px);
			-webkit-backdrop-filter: blur(8px);
			transition:
				box-shadow var(--duration-fast) var(--easing-standard),
				background-color var(--duration-fast) var(--easing-standard);
		}
		.site-nav.scrolled {
			box-shadow: 0 1px 0 var(--color-border);
			background-color: color-mix(in oklch, var(--color-bg) 95%, transparent);
		}
		@media (prefers-reduced-motion: reduce) {
			.site-nav {
				transition: none;
			}
		}
		.brand {
			display: inline-flex;
			align-items: center;
			gap: 0.5rem;
			text-decoration: none;
			color: var(--color-fg);
			font-weight: var(--font-weight-semibold);
		}
		.mark {
			color: var(--color-brand);
		}
		.links {
			display: flex;
			gap: 1.5rem;
			list-style: none;
			padding: 0;
			margin: 0;
			flex: 1;
		}
		.links a {
			color: var(--color-fg-muted);
			text-decoration: none;
			font-size: var(--font-size-sm);
		}
		.links a:hover {
			color: var(--color-fg);
		}
		.actions {
			display: inline-flex;
			gap: 0.5rem;
			align-items: center;
		}
		.action {
			padding-inline: 0.9rem;
			padding-block: 0.45rem;
			border-radius: var(--radius-md);
			text-decoration: none;
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
		}
		.action.secondary {
			color: var(--color-fg);
		}
		.action.secondary:hover {
			background-color: var(--color-bg-raised);
		}
		.action.primary {
			background-color: var(--color-brand);
			color: var(--color-brand-fg);
		}
		.action.primary:hover {
			background-color: var(--color-brand-hover);
		}
		@media (max-width: 640px) {
			.links {
				display: none;
			}
		}
	}
</style>
