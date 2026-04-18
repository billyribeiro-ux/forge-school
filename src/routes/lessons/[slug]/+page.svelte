<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.meta.title} — ForgeSchool</title>
	<meta name="description" content="Lesson {data.meta.number}: {data.meta.title}" />
</svelte:head>

<article class="lesson-page">
	<header class="lesson-header">
		<nav class="breadcrumb" aria-label="Breadcrumb">
			<a href="/lessons">Curriculum</a>
			<span aria-hidden="true"> / </span>
			<span>Module {data.meta.module} — {data.meta.moduleTitle}</span>
		</nav>
		<p class="lesson-number">Lesson {String(data.meta.number).padStart(3, '0')}</p>
		<h1>{data.meta.title}</h1>
		<dl class="lesson-meta">
			<div class="meta-row">
				<dt>Time</dt>
				<dd>{data.meta.estimatedMinutes} minutes</dd>
			</div>
			<div class="meta-row">
				<dt>Module</dt>
				<dd>{data.meta.moduleTitle}</dd>
			</div>
			<div class="meta-row">
				<dt>Phase</dt>
				<dd>Phase {data.meta.phase}, Step {data.meta.step}</dd>
			</div>
			{#if data.meta.filesTouched.length > 0}
				<div class="meta-row">
					<dt>Files touched</dt>
					<dd>
						<ul class="files">
							{#each data.meta.filesTouched as file (file)}
								<li><code>{file}</code></li>
							{/each}
						</ul>
					</dd>
				</div>
			{/if}
		</dl>
	</header>

	<div class="lesson-body">
		<data.Component />
	</div>

	<footer class="lesson-footer">
		<a href="/lessons" class="back-link">← All lessons</a>
	</footer>
</article>

<style>
	@layer components {
		.lesson-page {
			max-inline-size: 52rem;
			margin-inline: auto;
			padding-inline: 1.5rem;
			padding-block: 3rem;
		}

		.lesson-header {
			margin-block-end: 2.5rem;
			padding-block-end: 2rem;
			border-block-end: 1px solid var(--color-border);
		}

		.breadcrumb {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5ch;
			font-size: var(--font-size-sm);
			color: var(--color-fg-subtle);
			margin-block-end: 1rem;
		}

		.breadcrumb a {
			color: inherit;
			text-decoration: none;
		}

		.breadcrumb a:hover {
			color: var(--color-link);
			text-decoration: underline;
		}

		.lesson-number {
			font-family: var(--font-mono);
			font-size: var(--font-size-sm);
			letter-spacing: var(--letter-spacing-wide);
			color: var(--color-brand);
			margin-block-end: 0.5rem;
		}

		.lesson-header h1 {
			font-size: var(--font-size-4xl);
			letter-spacing: var(--letter-spacing-tight);
			margin-block-end: 1.5rem;
		}

		.lesson-meta {
			display: grid;
			gap: 0.5rem;
			font-size: var(--font-size-sm);
			color: var(--color-fg-muted);
		}

		.meta-row {
			display: grid;
			grid-template-columns: minmax(8rem, max-content) 1fr;
			gap: 1rem;
			align-items: start;
		}

		.meta-row dt {
			font-weight: var(--font-weight-semibold);
			color: var(--color-fg-subtle);
			text-transform: uppercase;
			letter-spacing: var(--letter-spacing-widest);
			font-size: var(--font-size-xs);
			padding-block-start: 0.1em;
		}

		.meta-row dd {
			margin: 0;
		}

		.files {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem 0.75rem;
			list-style: none;
			padding: 0;
		}

		.files code {
			font-size: var(--font-size-xs);
			padding-inline: 0.4em;
			padding-block: 0.15em;
			background: var(--color-bg-sunken);
			border-radius: var(--radius-sm);
		}

		.lesson-body {
			font-size: var(--font-size-base);
			line-height: var(--line-height-relaxed);
		}

		.lesson-body :global(h2) {
			font-size: var(--font-size-2xl);
			margin-block-start: 2.5rem;
			margin-block-end: 1rem;
		}

		.lesson-body :global(h3) {
			font-size: var(--font-size-xl);
			margin-block-start: 2rem;
			margin-block-end: 0.75rem;
		}

		.lesson-body :global(p) {
			margin-block-end: 1rem;
		}

		.lesson-body :global(ul),
		.lesson-body :global(ol) {
			margin-block-end: 1rem;
			padding-inline-start: 1.5rem;
			list-style: revert;
		}

		.lesson-body :global(li) {
			margin-block-end: 0.5rem;
		}

		.lesson-body :global(pre) {
			margin-block: 1rem;
		}

		.lesson-body :global(blockquote) {
			border-inline-start: 3px solid var(--color-brand);
			padding-inline-start: 1rem;
			margin-block: 1rem;
			color: var(--color-fg-muted);
		}

		.lesson-footer {
			margin-block-start: 3rem;
			padding-block-start: 2rem;
			border-block-start: 1px solid var(--color-border);
		}

		.back-link {
			color: var(--color-link);
			font-size: var(--font-size-sm);
		}
	}
</style>
