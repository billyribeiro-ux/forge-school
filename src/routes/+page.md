<script lang="ts">
	import Icon from '@iconify/svelte';
	import ForgeMark from '$lib/icons/generated/ForgeMark.svelte';
</script>

# Welcome to ForgeSchool

<p aria-label="ForgeSchool iconography smoke test" style="display: flex; gap: 0.75rem; align-items: center; font-size: var(--font-size-xl); color: var(--color-brand);">
	<ForgeMark />
	<Icon icon="ph:lightning-bold" aria-hidden="true" />
	<Icon icon="carbon:code" aria-hidden="true" />
	<span style="font-size: var(--font-size-base); color: var(--color-fg-muted);">Iconography smoke test — ForgeMark (bespoke), Phosphor, Carbon — all inherit currentColor.</span>
</p>

This is a smoke test for the [mdsvex](https://mdsvex.pngwn.io/) pipeline — a Markdown file compiled as a Svelte component and served as a route. The two glyphs above prove the Iconify pipeline: Phosphor (`ph:lightning-bold`) and Carbon (`carbon:code`) render inline, inherit `currentColor` via the parent's `color` property, and scale with the fluid type token `--font-size-xl`.

Visit [svelte.dev/docs/kit](https://svelte.dev/docs/kit) to read the SvelteKit documentation.
