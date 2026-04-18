<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	// Order matters: layers.css must import first so the @layer precedence
	// is declared before any other stylesheet registers a layer.
	import '$lib/styles/layers.css';
	import '$lib/styles/reset.css';
	import '$lib/styles/tokens.css';
	import '$lib/styles/breakpoints.css';
	import '$lib/styles/typography.css';
	import '$lib/styles/base.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
