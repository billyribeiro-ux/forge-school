<script lang="ts">
	import ForgeMark from '$lib/icons/generated/ForgeMark.svelte';
	import RevealOnScroll from '$lib/components/marketing/RevealOnScroll.svelte';
	import BigCTA from '$lib/components/marketing/BigCTA.svelte';
	import FAQ from '$lib/components/marketing/FAQ.svelte';
	import StackGrid from '$lib/components/marketing/StackGrid.svelte';
	import ValueProp from '$lib/components/marketing/ValueProp.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let totalHours = $derived(Math.round(data.totalMinutes / 60));
	let firstLesson = $derived(data.modules[0]?.lessons[0]);
</script>

<svelte:head>
	<title>ForgeSchool — Build a PE7 fullstack platform, lesson by lesson</title>
	<meta
		name="description"
		content="A {data.totalLessons}-lesson course that teaches production-grade fullstack engineering by building a real commerce platform. Every lesson is one git commit."
	/>
</svelte:head>

<main class="landing">
	<section class="hero">
		<div class="hero-inner">
			<RevealOnScroll>
				<ForgeMark size="3rem" />
			</RevealOnScroll>
			<RevealOnScroll delayMs={80}>
				<p class="eyebrow">ForgeSchool</p>
			</RevealOnScroll>
			<RevealOnScroll delayMs={140}>
				<h1>
					Learn production engineering by building a<br />
					<span class="accent">real fullstack platform</span>.
				</h1>
			</RevealOnScroll>
			<RevealOnScroll delayMs={220}>
				<p class="lede">
					{data.totalLessons} lessons across {data.modules.length} modules. Every lesson is one git
					commit you author with us — from blank repo to shipped product. SvelteKit 2, Svelte 5
					runes, TypeScript strict, Postgres + Drizzle, Stripe, Motion. No shortcuts, no hacks,
					built for ten-year longevity.
				</p>
			</RevealOnScroll>
			<RevealOnScroll delayMs={300}>
				<div class="cta-row">
					{#if firstLesson !== undefined}
						<a class="cta primary" href="/lessons/{firstLesson.slug}">
							Start Lesson 001 — {firstLesson.title}
						</a>
					{/if}
					<a class="cta secondary" href="/lessons">Browse curriculum</a>
				</div>
			</RevealOnScroll>
			<RevealOnScroll delayMs={380}>
				<dl class="stats">
					<div class="stat">
						<dt>Lessons</dt>
						<dd>{data.totalLessons}</dd>
					</div>
					<div class="stat">
						<dt>Modules</dt>
						<dd>{data.modules.length}</dd>
					</div>
					<div class="stat">
						<dt>Estimated time</dt>
						<dd>{totalHours} hours</dd>
					</div>
				</dl>
			</RevealOnScroll>
		</div>
	</section>

	<ValueProp />
	<StackGrid />

	<section class="modules-preview" aria-labelledby="modules-heading">
		<div class="section-inner">
			<RevealOnScroll>
				<h2 id="modules-heading">The eight modules</h2>
			</RevealOnScroll>
			<ol class="module-grid">
				{#each data.modules as mod, i (mod.number)}
					<RevealOnScroll delayMs={i * 60}>
						<li class="module-card">
							<p class="module-num">Module {mod.number}</p>
							<h3>{mod.title}</h3>
							<p class="module-count">{mod.lessons.length} lessons</p>
						</li>
					</RevealOnScroll>
				{/each}
			</ol>
		</div>
	</section>

	<FAQ />

	<section class="pe7-callout" aria-labelledby="pe7-heading">
		<!-- PE7 callout retained above the CTA -->
		<div class="section-inner">
			<h2 id="pe7-heading">Why PE7?</h2>
			<p>
				Most coding courses teach toy projects with toy patterns. ForgeSchool teaches engineering
				judgment — why one approach survives ten years and another collapses under its own weight.
				Every lesson's <strong>Why we chose this</strong> section names two to four real
				alternatives with real failure modes. That's the section no other course has. It's the
				reason you'll remember what you learned.
			</p>
		</div>
	</section>

	<BigCTA />
</main>

<style>
	@layer components {
		.landing {
			display: grid;
			gap: 0;
		}

		.hero {
			padding-block: clamp(3rem, 8vw, 6rem);
			padding-inline: 1.5rem;
			background-color: var(--color-bg);
			border-block-end: 1px solid var(--color-border);
		}

		.hero-inner {
			max-inline-size: 56rem;
			margin-inline: auto;
			text-align: center;
		}

		.eyebrow {
			font-size: var(--font-size-xs);
			letter-spacing: var(--letter-spacing-widest);
			text-transform: uppercase;
			color: var(--color-brand);
			font-weight: var(--font-weight-semibold);
			margin-block-start: 1rem;
		}

		.hero h1 {
			font-size: var(--font-size-5xl);
			line-height: var(--line-height-tight);
			letter-spacing: var(--letter-spacing-tight);
			margin-block: 1rem 1.5rem;
			max-inline-size: 20ch;
			margin-inline: auto;
		}

		.accent {
			color: var(--color-brand);
		}

		.lede {
			font-size: var(--font-size-lg);
			line-height: var(--line-height-relaxed);
			color: var(--color-fg-muted);
			max-inline-size: 42rem;
			margin-inline: auto;
			margin-block-end: 2.5rem;
		}

		.cta-row {
			display: flex;
			flex-wrap: wrap;
			gap: 0.75rem;
			justify-content: center;
			margin-block-end: 2.5rem;
		}

		.cta {
			display: inline-flex;
			align-items: center;
			padding-inline: 1.25rem;
			padding-block: 0.875rem;
			border-radius: var(--radius-md);
			text-decoration: none;
			font-weight: var(--font-weight-medium);
			font-size: var(--font-size-base);
			transition:
				background-color var(--duration-fast) var(--easing-standard),
				color var(--duration-fast) var(--easing-standard);
		}

		.cta.primary {
			background-color: var(--color-brand);
			color: var(--color-brand-fg);
		}

		.cta.primary:hover {
			background-color: var(--color-brand-hover);
		}

		.cta.secondary {
			background-color: transparent;
			color: var(--color-fg);
			border: 1px solid var(--color-border-strong);
		}

		.cta.secondary:hover {
			background-color: var(--color-bg-sunken);
		}

		.stats {
			display: flex;
			gap: 2.5rem;
			justify-content: center;
			flex-wrap: wrap;
			color: var(--color-fg-muted);
			font-size: var(--font-size-sm);
		}

		.stat dt {
			text-transform: uppercase;
			letter-spacing: var(--letter-spacing-widest);
			font-size: var(--font-size-xs);
			color: var(--color-fg-subtle);
		}

		.stat dd {
			font-size: var(--font-size-xl);
			font-weight: var(--font-weight-semibold);
			color: var(--color-fg);
			font-variant-numeric: tabular-nums;
			margin-block-start: 0.25rem;
		}

		.modules-preview,
		.pe7-callout {
			padding-block: 4rem;
			padding-inline: 1.5rem;
		}

		.section-inner {
			max-inline-size: 72rem;
			margin-inline: auto;
		}

		.modules-preview h2,
		.pe7-callout h2 {
			font-size: var(--font-size-3xl);
			margin-block-end: 2rem;
			text-align: center;
		}

		.module-grid {
			list-style: none;
			padding: 0;
			margin: 0;
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
			gap: 1rem;
		}

		.module-card {
			padding: 1.5rem;
			border: 1px solid var(--color-border);
			border-radius: var(--radius-lg);
			background-color: var(--color-bg-raised);
			transition: border-color var(--duration-fast) var(--easing-standard);
		}

		.module-card:hover {
			border-color: var(--color-brand);
		}

		.module-num {
			font-family: var(--font-mono);
			font-size: var(--font-size-xs);
			color: var(--color-fg-subtle);
			letter-spacing: var(--letter-spacing-wide);
			margin-block-end: 0.5rem;
		}

		.module-card h3 {
			font-size: var(--font-size-lg);
			font-weight: var(--font-weight-semibold);
			margin-block-end: 0.5rem;
		}

		.module-count {
			font-size: var(--font-size-sm);
			color: var(--color-fg-muted);
		}

		.pe7-callout {
			background-color: var(--color-bg-sunken);
			border-block-start: 1px solid var(--color-border);
		}

		.pe7-callout p {
			font-size: var(--font-size-lg);
			line-height: var(--line-height-relaxed);
			color: var(--color-fg-muted);
			max-inline-size: 52rem;
			margin-inline: auto;
			text-align: center;
		}
	}
</style>
