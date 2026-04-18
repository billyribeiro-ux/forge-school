<!--
	SeoMeta — per-page OpenGraph + Twitter + JSON-LD bundle.

	Drop inside `<svelte:head>`:
		<SeoMeta title="Pricing" description="..." path="/pricing" />

	Emits:
	- title + description
	- og:title / og:description / og:url / og:type
	- twitter:card / twitter:title / twitter:description
	- `<link rel="canonical">`
	- Optional JSON-LD (application/ld+json) when `jsonLd` is passed.
-->
<script lang="ts">
	import { PUBLIC_APP_URL, PUBLIC_APP_NAME } from '$env/static/public';

	type Props = {
		title: string;
		description: string;
		path: string;
		ogType?: 'website' | 'article';
		jsonLd?: Record<string, unknown> | undefined;
	};

	let { title, description, path, ogType = 'website', jsonLd }: Props = $props();

	const origin = $derived(PUBLIC_APP_URL.replace(/\/$/, ''));
	const canonical = $derived(`${origin}${path}`);
	const fullTitle = $derived(`${title} — ${PUBLIC_APP_NAME}`);
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical} />
	<meta property="og:type" content={ogType} />
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonical} />
	<meta property="og:site_name" content={PUBLIC_APP_NAME} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={fullTitle} />
	<meta name="twitter:description" content={description} />
	{#if jsonLd !== undefined}
		{@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}</` + `script>`}
	{/if}
</svelte:head>
