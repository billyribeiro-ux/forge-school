<!--
	Plausible — privacy-first analytics. Loads the tracker script only
	when PUBLIC_PLAUSIBLE_DOMAIN is set. No cookies, no personal data.

	Script loads with defer so it never blocks paint.
-->
<script lang="ts">
	import { PUBLIC_PLAUSIBLE_DOMAIN } from '$env/static/public';

	const domain = PUBLIC_PLAUSIBLE_DOMAIN;
</script>

{#if domain !== ''}
	<svelte:head>
		<script defer data-domain={domain} src="https://plausible.io/js/script.js"></script>
	</svelte:head>
{/if}
