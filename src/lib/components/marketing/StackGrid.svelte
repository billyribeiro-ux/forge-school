<!-- StackGrid — "the stack" visual. 8 pill cards naming the locked stack. -->
<script lang="ts">
	import RevealOnScroll from './RevealOnScroll.svelte';

	const stack = [
		{ name: 'SvelteKit 2', sub: 'Fullstack framework' },
		{ name: 'Svelte 5 runes', sub: 'Reactivity' },
		{ name: 'TypeScript strict', sub: 'Zero any' },
		{ name: 'PostgreSQL 16', sub: 'Database' },
		{ name: 'Drizzle ORM', sub: 'Typed SQL' },
		{ name: 'Stripe', sub: 'Payments (test mode)' },
		{ name: 'Playwright', sub: 'E2E' },
		{ name: 'Vitest', sub: 'Unit tests' }
	] as const;
</script>

<section class="stack" aria-labelledby="stack-heading">
	<div class="inner">
		<RevealOnScroll>
			<p class="eyebrow">The stack</p>
			<h2 id="stack-heading">Locked in. Every choice is deliberate.</h2>
		</RevealOnScroll>
		<ul class="grid">
			{#each stack as s, i (s.name)}
				<RevealOnScroll delayMs={i * 40}>
					<li class="pill">
						<p class="name">{s.name}</p>
						<p class="sub">{s.sub}</p>
					</li>
				</RevealOnScroll>
			{/each}
		</ul>
	</div>
</section>

<style>
	@layer components {
		.stack {
			padding: 4rem 1.5rem;
			background-color: var(--color-bg-sunken);
			border-block: 1px solid var(--color-border);
		}
		.inner {
			max-inline-size: 72rem;
			margin-inline: auto;
		}
		.eyebrow {
			text-align: center;
			font-size: var(--font-size-xs);
			letter-spacing: var(--letter-spacing-widest);
			text-transform: uppercase;
			color: var(--color-brand);
			font-weight: var(--font-weight-semibold);
		}
		h2 {
			font-size: var(--font-size-3xl);
			text-align: center;
			margin-block: 0.5rem 2rem;
		}
		.grid {
			list-style: none;
			padding: 0;
			margin: 0;
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
			gap: 0.75rem;
		}
		.pill {
			padding: 1rem 1.25rem;
			border: 1px solid var(--color-border);
			border-radius: var(--radius-md);
			background-color: var(--color-bg);
			transition: border-color var(--duration-fast) var(--easing-standard);
		}
		.pill:hover {
			border-color: var(--color-brand);
		}
		.name {
			font-weight: var(--font-weight-semibold);
			margin: 0;
		}
		.sub {
			font-size: var(--font-size-sm);
			color: var(--color-fg-muted);
			margin: 0.2rem 0 0;
		}
	}
</style>
