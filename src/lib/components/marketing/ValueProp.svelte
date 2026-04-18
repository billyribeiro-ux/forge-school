<!--
	ValueProp — three-column value-prop callout for the landing page.
-->
<script lang="ts">
	import RevealOnScroll from './RevealOnScroll.svelte';
</script>

<section class="value-prop" aria-labelledby="value-heading">
	<div class="inner">
		<RevealOnScroll>
			<h2 id="value-heading">Why ForgeSchool hits different</h2>
		</RevealOnScroll>
		<ol class="grid">
			<RevealOnScroll delayMs={80}>
				<li class="card">
					<p class="num">01</p>
					<h3>One commit per lesson</h3>
					<p>
						Every lesson maps to exactly one git commit. The course's own history is the worked
						example — you diff your branch against ours.
					</p>
				</li>
			</RevealOnScroll>
			<RevealOnScroll delayMs={140}>
				<li class="card">
					<p class="num">02</p>
					<h3>Judgment, not just code</h3>
					<p>
						Every lesson names two to four real alternatives we rejected, with real failure modes.
						The "Why we chose this" section is the moat.
					</p>
				</li>
			</RevealOnScroll>
			<RevealOnScroll delayMs={200}>
				<li class="card">
					<p class="num">03</p>
					<h3>Built for 10-year longevity</h3>
					<p>
						TypeScript strict, zero <code>any</code>, zero <code>@ts-ignore</code>, zero hacks.
						Patterns hold up past framework churn.
					</p>
				</li>
			</RevealOnScroll>
		</ol>
	</div>
</section>

<style>
	@layer components {
		.value-prop {
			padding-inline: 1.5rem;
			padding-block: 4rem;
			background-color: var(--color-bg);
		}
		.inner {
			max-inline-size: 72rem;
			margin-inline: auto;
		}
		h2 {
			font-size: var(--font-size-3xl);
			text-align: center;
			margin-block-end: 2.5rem;
		}
		.grid {
			list-style: none;
			padding: 0;
			margin: 0;
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
			gap: 1.25rem;
		}
		.card {
			padding: 1.5rem;
			border: 1px solid var(--color-border);
			border-radius: var(--radius-lg);
			background-color: var(--color-bg-raised);
		}
		.num {
			font-family: var(--font-mono);
			font-size: var(--font-size-xs);
			letter-spacing: var(--letter-spacing-wide);
			color: var(--color-brand);
			margin-block-end: 0.75rem;
		}
		.card h3 {
			font-size: var(--font-size-lg);
			margin-block-end: 0.5rem;
		}
		.card p {
			font-size: var(--font-size-sm);
			color: var(--color-fg-muted);
			line-height: var(--line-height-relaxed);
		}
		.card code {
			font-family: var(--font-mono);
			font-size: var(--font-size-xs);
			background-color: var(--color-bg-sunken);
			padding-inline: 0.25rem;
			border-radius: var(--radius-sm);
		}
	}
</style>
