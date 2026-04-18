<script lang="ts">
	import type { ModuleIndex } from '$lib/curriculum';

	type Props = {
		module: ModuleIndex;
		currentSlug: string;
	};

	let { module: mod, currentSlug }: Props = $props();

	// Plain function closure — reads the reactive `currentSlug` prop at
	// call time. No `$derived.by` needed: there is no heavy computation
	// to memoize and wrapping a function in a derived is an anti-pattern.
	function isCurrent(slug: string): boolean {
		return slug === currentSlug;
	}
</script>

<aside class="module-sidebar" aria-label="Module navigation">
	<header class="sidebar-header">
		<p class="sidebar-eyebrow">Module {mod.number}</p>
		<h2 class="sidebar-title">{mod.title}</h2>
		<p class="sidebar-meta">{mod.lessons.length} lessons</p>
	</header>
	<ol class="sidebar-lessons">
		{#each mod.lessons as lesson (lesson.number)}
			{@const current = isCurrent(lesson.slug)}
			<li class={['sidebar-item', { current }]}>
				<a href="/lessons/{lesson.slug}" aria-current={current ? 'page' : undefined}>
					<span class="item-num">{String(lesson.number).padStart(3, '0')}</span>
					<span class="item-title">{lesson.title}</span>
				</a>
			</li>
		{/each}
	</ol>
</aside>

<style>
	@layer components {
		.module-sidebar {
			position: sticky;
			inset-block-start: 2rem;
			max-block-size: calc(100dvh - 4rem);
			overflow-y: auto;
			padding-inline-end: 0.5rem;
		}

		.sidebar-header {
			padding-block-end: 1rem;
			margin-block-end: 0.75rem;
			border-block-end: 1px solid var(--color-border);
		}

		.sidebar-eyebrow {
			font-size: var(--font-size-xs);
			letter-spacing: var(--letter-spacing-widest);
			text-transform: uppercase;
			color: var(--color-brand);
			font-weight: var(--font-weight-semibold);
		}

		.sidebar-title {
			font-size: var(--font-size-lg);
			font-weight: var(--font-weight-semibold);
			margin-block: 0.25rem 0.5rem;
		}

		.sidebar-meta {
			font-size: var(--font-size-xs);
			color: var(--color-fg-subtle);
		}

		.sidebar-lessons {
			display: grid;
			gap: 0.125rem;
			list-style: none;
			padding: 0;
			margin: 0;
		}

		.sidebar-item a {
			display: grid;
			grid-template-columns: 2.5rem 1fr;
			gap: 0.5rem;
			align-items: baseline;
			padding-block: 0.5rem;
			padding-inline: 0.5rem;
			border-radius: var(--radius-sm);
			font-size: var(--font-size-sm);
			text-decoration: none;
			color: var(--color-fg-muted);
			transition:
				color var(--duration-fast) var(--easing-standard),
				background-color var(--duration-fast) var(--easing-standard);
		}

		.sidebar-item a:hover {
			color: var(--color-fg);
			background-color: var(--color-bg-sunken);
		}

		.sidebar-item.current a {
			color: var(--color-brand);
			background-color: var(--color-primary-50);
			font-weight: var(--font-weight-medium);
		}

		.item-num {
			font-family: var(--font-mono);
			font-size: var(--font-size-xs);
			color: var(--color-fg-subtle);
		}

		.sidebar-item.current .item-num {
			color: var(--color-brand);
		}

		.item-title {
			line-height: var(--line-height-snug);
		}
	}
</style>
