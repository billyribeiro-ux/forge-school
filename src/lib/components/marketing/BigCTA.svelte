<!-- BigCTA — closing call-to-action section. -->
<script lang="ts">
	import RevealOnScroll from './RevealOnScroll.svelte';
</script>

<section class="big-cta">
	<div class="inner">
		<RevealOnScroll>
			<h2>Start shipping production-grade code.</h2>
			<p class="lede">
				170 lessons. 8 modules. One commit at a time. Every decision documented. Every trade-off
				named.
			</p>
			<div class="actions">
				<a class="primary" href="/pricing">See plans →</a>
				<a class="secondary" href="/lessons">Browse curriculum</a>
			</div>
		</RevealOnScroll>
	</div>
</section>

<style>
	@layer components {
		.big-cta {
			padding: 5rem 1.5rem;
			background: linear-gradient(
				135deg,
				var(--color-bg) 0%,
				color-mix(in oklch, var(--color-brand) 10%, var(--color-bg)) 100%
			);
			border-block: 1px solid var(--color-border);
			text-align: center;
		}
		.inner {
			max-inline-size: 48rem;
			margin-inline: auto;
		}
		h2 {
			font-size: var(--font-size-4xl);
			margin-block-end: 1rem;
		}
		.lede {
			font-size: var(--font-size-lg);
			color: var(--color-fg-muted);
			margin-block-end: 2rem;
			line-height: var(--line-height-relaxed);
		}
		.actions {
			display: inline-flex;
			gap: 0.75rem;
			flex-wrap: wrap;
			justify-content: center;
		}
		.primary,
		.secondary {
			padding: 0.875rem 1.5rem;
			border-radius: var(--radius-md);
			text-decoration: none;
			font-weight: var(--font-weight-medium);
		}
		.primary {
			background-color: var(--color-brand);
			color: var(--color-brand-fg);
		}
		.primary:hover {
			background-color: var(--color-brand-hover);
		}
		.secondary {
			color: var(--color-fg);
			border: 1px solid var(--color-border-strong);
		}
		.secondary:hover {
			background-color: var(--color-bg-sunken);
		}
	}
</style>
