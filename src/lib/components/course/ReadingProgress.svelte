<script lang="ts">
	// Reactive progress 0..1. Updated via <svelte:window> listeners;
	// the bar's transform is driven by style:transform below, so no
	// bind:this or imperative DOM writes are needed.
	let progress = $state(0);
	let rafId: number | null = null;

	function measure(): void {
		rafId = null;
		const doc = document.documentElement;
		const maxScroll = doc.scrollHeight - doc.clientHeight;
		progress = maxScroll <= 0 ? 0 : Math.min(1, Math.max(0, window.scrollY / maxScroll));
	}

	function schedule(): void {
		// Respect user's motion preference: if they've opted out, the bar
		// stays at 0 and we skip updates entirely. (CSS also disables the
		// transition under the same media query.)
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		if (rafId !== null) return;
		rafId = requestAnimationFrame(measure);
	}
</script>

<svelte:window onscroll={schedule} onresize={schedule} onload={schedule} />

<div class="reading-progress" aria-hidden="true">
	<div class="bar" style:transform="scaleX({progress})"></div>
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
