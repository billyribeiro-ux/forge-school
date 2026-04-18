<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let totalHours = $derived(Math.round((data.totalMinutes / 60) * 10) / 10);
</script>

<svelte:head>
	<title>Curriculum — ForgeSchool</title>
	<meta
		name="description"
		content="The full ForgeSchool curriculum: {data.totalLessons} lessons across {data.modules.length} modules, every lesson paired with a single git commit."
	/>
</svelte:head>

<article class="lessons-index">
	<header class="hero">
		<p class="eyebrow">ForgeSchool</p>
		<h1>The Curriculum</h1>
		<p class="lede">
			{data.totalLessons} lessons across {data.modules.length} modules. Every lesson is one atomic commit;
			every commit is one reviewable change. Roughly {totalHours} hours of deliberate work from
			blank repo to shipped product.
		</p>
	</header>

	<ol class="modules">
		{#each data.modules as mod (mod.number)}
			<li class="module">
				<header class="module-header">
					<p class="module-eyebrow">Module {mod.number}</p>
					<h2>{mod.title}</h2>
					<p class="module-meta">
						{mod.lessons.length} lessons ·
						{mod.lessons.reduce((s, l) => s + l.estimatedMinutes, 0)} minutes
					</p>
				</header>
				<ol class="lesson-list">
					{#each mod.lessons as lesson (lesson.number)}
						<li class="lesson-row">
							<a href="/lessons/{lesson.slug}" class="lesson-link">
								<span class="lesson-number">{String(lesson.number).padStart(3, '0')}</span>
								<span class="lesson-title">{lesson.title}</span>
								<span class="lesson-time">{lesson.estimatedMinutes}m</span>
							</a>
						</li>
					{/each}
				</ol>
			</li>
		{/each}
	</ol>
</article>

<style>
	@layer components {
		.lessons-index {
			max-inline-size: 72rem;
			margin-inline: auto;
			padding-inline: 1.5rem;
			padding-block: 3rem;
		}

		.hero {
			margin-block-end: 3rem;
			padding-block-end: 2rem;
			border-block-end: 1px solid var(--color-border);
		}

		.eyebrow,
		.module-eyebrow {
			font-size: var(--font-size-xs);
			font-weight: var(--font-weight-semibold);
			letter-spacing: var(--letter-spacing-widest);
			text-transform: uppercase;
			color: var(--color-brand);
			margin-block-end: 0.5rem;
		}

		.hero h1 {
			font-size: var(--font-size-5xl);
			margin-block-end: 1rem;
		}

		.lede {
			font-size: var(--font-size-lg);
			line-height: var(--line-height-relaxed);
			color: var(--color-fg-muted);
			max-inline-size: 50rem;
		}

		.modules {
			display: grid;
			gap: 3rem;
		}

		.module-header {
			margin-block-end: 1.25rem;
		}

		.module-header h2 {
			font-size: var(--font-size-3xl);
			margin-block-end: 0.25rem;
		}

		.module-meta {
			font-size: var(--font-size-sm);
			color: var(--color-fg-subtle);
		}

		.lesson-list {
			display: grid;
			gap: 0;
			border-block-start: 1px solid var(--color-border);
		}

		.lesson-link {
			display: grid;
			grid-template-columns: 4rem 1fr auto;
			gap: 1rem;
			align-items: baseline;
			padding-block: 0.875rem;
			padding-inline: 0.5rem;
			border-block-end: 1px solid var(--color-border);
			text-decoration: none;
			color: var(--color-fg);
			transition:
				background-color var(--duration-fast) var(--easing-standard),
				color var(--duration-fast) var(--easing-standard);
		}

		.lesson-link:hover {
			background-color: var(--color-bg-sunken);
			color: var(--color-brand);
		}

		.lesson-number {
			font-family: var(--font-mono);
			font-size: var(--font-size-sm);
			color: var(--color-fg-subtle);
		}

		.lesson-title {
			font-size: var(--font-size-base);
		}

		.lesson-time {
			font-size: var(--font-size-sm);
			color: var(--color-fg-subtle);
			font-variant-numeric: tabular-nums;
		}
	}
</style>
