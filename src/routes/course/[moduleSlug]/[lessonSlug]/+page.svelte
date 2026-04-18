<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const mod = $derived(data.module);
	const lesson = $derived(data.lesson);
</script>

<article class="lesson-view">
	<nav class="breadcrumbs">
		<a href="/course">Course</a>
		<span aria-hidden="true">/</span>
		<a href="/course/{mod.slug}">{mod.title}</a>
	</nav>

	<header>
		<span class="eyebrow">
			Lesson {lesson.orderIndex + 1} of this module
		</span>
		<h1>{lesson.title}</h1>
		{#if data.completed}
			<span class="badge">Completed</span>
		{/if}
	</header>

	<div class="body">
		<!--
			Markdown-to-HTML rendering for customer lessons is deferred
			(see lesson 082 Mistake log). Preserve newlines via whitespace:
			pre-wrap so the placeholder body reads naturally.
		-->
		<p class="prose">{lesson.body}</p>
	</div>

	<form method="POST" action="?/complete" class="complete-form">
		<button type="submit">
			{data.completed ? 'Mark complete again & continue' : 'Mark complete & continue'}
		</button>
	</form>
</article>

<style>
	.lesson-view {
		max-inline-size: 68ch;
		margin-inline: auto;
		padding-block: 2rem;
	}
	.breadcrumbs {
		display: flex;
		gap: 0.5rem;
		color: oklch(55% 0.02 270);
		font-size: 0.875rem;
	}
	.breadcrumbs a {
		color: inherit;
		text-decoration: none;
	}
	.breadcrumbs a:hover {
		text-decoration: underline;
	}
	.eyebrow {
		display: block;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: oklch(55% 0.02 270);
	}
	.badge {
		display: inline-block;
		margin-block-start: 0.5rem;
		padding: 0.125rem 0.5rem;
		background: oklch(92% 0.08 145);
		color: oklch(35% 0.12 145);
		border-radius: 999px;
		font-size: 0.75rem;
	}
	.prose {
		white-space: pre-wrap;
		line-height: 1.6;
	}
	.complete-form {
		margin-block-start: 2rem;
		display: flex;
		justify-content: flex-end;
	}
	.complete-form button {
		padding: 0.75rem 1.25rem;
		background: oklch(55% 0.18 265);
		color: oklch(99% 0 0);
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
	}
	.complete-form button:hover {
		background: oklch(48% 0.18 265);
	}
</style>
