<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import CartPersistence from '$lib/cart/CartPersistence.svelte';
	import Plausible from '$lib/components/marketing/Plausible.svelte';
	import SiteFooter from '$lib/components/marketing/SiteFooter.svelte';
	import SiteNav from '$lib/components/marketing/SiteNav.svelte';
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';
	// Order matters: layers.css must import first so the @layer precedence
	// is declared before any other stylesheet registers a layer.
	import '$lib/styles/layers.css';
	import '$lib/styles/reset.css';
	import '$lib/styles/tokens.css';
	import '$lib/styles/breakpoints.css';
	import '$lib/styles/typography.css';
	import '$lib/styles/base.css';

	let { children }: LayoutProps = $props();

	// Admin shell renders its own shell; hide site chrome there.
	const chromeVisible = $derived(!(page.url.pathname.startsWith('/admin')));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<CartPersistence />
<Plausible />

{#if chromeVisible}
	<SiteNav />
{/if}

{@render children()}

{#if chromeVisible}
	<SiteFooter />
{/if}
