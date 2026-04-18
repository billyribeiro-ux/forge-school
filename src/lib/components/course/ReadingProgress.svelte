<script lang="ts">
	import { onMount } from 'svelte';

	let barEl: HTMLDivElement | undefined = $state();

	onMount(() => {
		if (barEl === undefined) return;
		if (typeof window === 'undefined') return;

		// Respect user's motion preference: if they've opted out, the bar
		// stays at its CSS default (scaleX(0)) and we skip the listener.
		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		let cleanup: (() => void) | undefined;

		if (prefersReducedMotion) {
			return;
		}

		let rafId: number | null = null;

		const update = () => {
			rafId = null;
			if (barEl === undefined) return;
			const doc = document.documentElement;
			const maxScroll = doc.scrollHeight - doc.clientHeight;
			const progress = maxScroll <= 0 ? 0 : Math.min(1, Math.max(0, window.scrollY / maxScroll));
			barEl.style.transform = `scaleX(${progress})`;
		};

		const onScroll = () => {
			if (rafId !== null) return;
			rafId = requestAnimationFrame(update);
		};

		// Load Motion lazily. It powers richer animation in future lessons;
		// for the progress bar a plain scroll listener keyed to rAF is enough.
		import('motion').then(() => {
			update();
			window.addEventListener('scroll', onScroll, { passive: true });
			window.addEventListener('resize', onScroll, { passive: true });
			cleanup = () => {
				window.removeEventListener('scroll', onScroll);
				window.removeEventListener('resize', onScroll);
				if (rafId !== null) cancelAnimationFrame(rafId);
			};
		});

		return () => {
			cleanup?.();
		};
	});
</script>

<div class="reading-progress" aria-hidden="true">
	<div class="bar" bind:this={barEl}></div>
</div>

<style>
	@layer components {
		.reading-progress {
			position: fixed;
			inset-block-start: 0;
			inset-inline: 0;
			block-size: 3px;
			background-color: transparent;
			z-index: 100;
			pointer-events: none;
		}

		.bar {
			block-size: 100%;
			inline-size: 100%;
			background-color: var(--color-brand);
			transform: scaleX(0);
			transform-origin: left;
			will-change: transform;
			transition: transform var(--duration-instant) linear;
		}

		@media (prefers-reduced-motion: reduce) {
			.bar {
				transition: none;
			}
		}
	}
</style>
