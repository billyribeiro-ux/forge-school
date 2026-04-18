<!-- FAQ — details/summary accordion; no JS required for open/close. -->
<script lang="ts">
	import RevealOnScroll from './RevealOnScroll.svelte';

	const items = [
		{
			q: 'Is this a video course?',
			a: "No. Every lesson is a written markdown document with exact commands, exact file contents, and a detailed judgment section. You learn by doing the commit, not by watching someone else do it."
		},
		{
			q: 'Will my code look exactly like yours?',
			a: "Within a lesson, yes — the prompts are that specific. Across lessons, your branch and ours will diverge where judgment lets you choose. Compare freely; the curriculum's git history is the answer key."
		},
		{
			q: 'Do I need Stripe experience?',
			a: 'No. Stripe runs in test mode end-to-end. Module 4 wires the full checkout + webhook + refund flow with only test keys.'
		},
		{
			q: 'What if a library updates?',
			a: "Every lesson references a concrete commit at a concrete pnpm-lock.yaml. The PE7 choices explicitly select stability-favoring libraries — the whole point is 10-year longevity."
		}
	] as const;
</script>

<section class="faq" aria-labelledby="faq-heading">
	<div class="inner">
		<RevealOnScroll>
			<h2 id="faq-heading">Questions students ask</h2>
		</RevealOnScroll>
		<ol class="list">
			{#each items as item, i (item.q)}
				<RevealOnScroll delayMs={i * 60}>
					<li>
						<details>
							<summary>{item.q}</summary>
							<p>{item.a}</p>
						</details>
					</li>
				</RevealOnScroll>
			{/each}
		</ol>
	</div>
</section>

<style>
	@layer components {
		.faq {
			padding: 4rem 1.5rem;
			background-color: var(--color-bg);
		}
		.inner {
			max-inline-size: 56rem;
			margin-inline: auto;
		}
		h2 {
			font-size: var(--font-size-3xl);
			text-align: center;
			margin-block-end: 2rem;
		}
		.list {
			list-style: none;
			padding: 0;
			margin: 0;
			display: grid;
			gap: 0.5rem;
		}
		details {
			border: 1px solid var(--color-border);
			border-radius: var(--radius-md);
			background-color: var(--color-bg-raised);
			padding: 0.75rem 1rem;
		}
		details[open] {
			border-color: var(--color-brand);
		}
		summary {
			cursor: pointer;
			font-weight: var(--font-weight-medium);
			list-style-position: outside;
		}
		details p {
			margin-block: 0.75rem 0;
			color: var(--color-fg-muted);
			line-height: var(--line-height-relaxed);
		}
	}
</style>
