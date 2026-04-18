<!--
	RevealOnScroll — intersection-observer reveal wrapper.

	Applies `opacity` + `translate-y` enter animation the first time the
	element enters the viewport. Respects `prefers-reduced-motion`:
	reduced-motion users see the content at full opacity immediately.

	Usage:
		<RevealOnScroll>
			<h1>Hero headline</h1>
		</RevealOnScroll>
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';

	type Props = {
		delayMs?: number;
		children: Snippet;
	};

	let { delayMs = 0, children }: Props = $props();

	let visible = $state(false);

	// Attachment: runs once on mount with the element, returns a cleanup.
	// Replaces the Svelte 4-era `bind:this` + `$effect` pattern.
	const reveal: Attachment<HTMLElement> = (node) => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			visible = true;
			return;
		}
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						visible = true;
						observer.disconnect();
					}
				}
			},
			{ rootMargin: '-8% 0px' }
		);
		observer.observe(node);
		return () => observer.disconnect();
	};
</script>

<div {@attach reveal} class={['reveal', { visible }]} style:transition-delay="{delayMs}ms">
	{@render children()}
</div>

<style>
	@layer components {
		.reveal {
			opacity: 0;
			transform: translateY(16px);
			transition:
				opacity 600ms var(--easing-standard, ease-out),
				transform 600ms var(--easing-standard, ease-out);
			transition-delay: 0ms;
		}
		.reveal.visible {
			opacity: 1;
			transform: translateY(0);
		}
		@media (prefers-reduced-motion: reduce) {
			.reveal {
				transition: none;
				opacity: 1;
				transform: none;
			}
		}
	}
</style>
