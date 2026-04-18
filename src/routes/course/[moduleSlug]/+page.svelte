<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const mod = $derived(data.module);
</script>

<section class="module-view">
	<nav class="breadcrumbs">
		<a href="/course">← All modules</a>
	</nav>

	<header>
		<span class="eyebrow">Module {mod.orderIndex + 1}</span>
		<h1>{mod.title}</h1>
	</header>

	<ol class="lesson-list">
		{#each mod.lessons as lesson (lesson.id)}
			<li>
				<a href="/course/{mod.slug}/{lesson.slug}">
					<span class="lesson-index">{String(lesson.orderIndex + 1).padStart(2, '0')}</span>
					<span class="lesson-title">{lesson.title}</span>
				</a>
			</li>
		{/each}
	</ol>

	{#if mod.lessons.length === 0}
		<p class="empty">This module has no lessons yet.</p>
	{/if}
</section>

<style>
	.module-view {
		max-inline-size: 68ch;
		margin-inline: auto;
		padding-block: 2rem;
	}
	.breadcrumbs a {
		color: oklch(55% 0.02 270);
		text-decoration: none;
		font-size: 0.875rem;
	}
	.eyebrow {
		display: block;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: oklch(55% 0.02 270);
	}
	.lesson-list {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 0.5rem;
	}
	.lesson-list a {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 1rem;
		align-items: center;
		padding: 0.875rem 1rem;
		border: 1px solid oklch(90% 0.01 270);
		border-radius: 0.5rem;
		text-decoration: none;
		color: inherit;
	}
	.lesson-list a:hover {
		border-color: oklch(55% 0.18 265);
	}
	.lesson-index {
		font-variant-numeric: tabular-nums;
		color: oklch(60% 0.02 270);
	}
	.empty {
		color: oklch(55% 0.02 270);
	}
</style>
