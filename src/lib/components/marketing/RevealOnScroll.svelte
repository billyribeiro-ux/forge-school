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

	type Props = {
		delayMs?: number;
		children: Snippet;
	};

	let { delayMs = 0, children }: Props = $props();

	let node: HTMLDivElement | undefined = $state();
	let visible = $state(false);
	let reducedMotion = $state(false);

	$effect(() => {
		if (typeof window === 'undefined') return;
		reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reducedMotion) {
			visible = true;
			return;
		}
		if (node === undefined) return;
		const target = node;
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
		observer.observe(target);
		return () => observer.disconnect();
	});
</script>

<div bind:this={node} class="reveal" class:visible style:transition-delay="{delayMs}ms">
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
