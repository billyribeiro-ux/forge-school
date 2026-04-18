<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<section class="course-index">
	{#if !data.entitled}
		<div class="gate">
			<h1>This course is included with ForgeSchool Lifetime</h1>
			<p>
				Unlock every lesson and every future module with a one-time purchase.
				Your progress carries over the moment you buy.
			</p>
			<a class="cta" href="/products/{data.productSlug}">See the lifetime plan</a>
		</div>
	{:else}
		<header>
			<h1>Your course</h1>
			<p>Work through the modules in order. Progress is tracked per lesson.</p>
		</header>

		<ol class="modules">
			{#each data.modules as mod (mod.id)}
				<li class="module-row">
					<a href="/course/{mod.slug}">
						<span class="index">{String(mod.orderIndex + 1).padStart(2, '0')}</span>
						<span class="title">{mod.title}</span>
						<span class="count">{mod.lessonCount} lesson{mod.lessonCount === 1 ? '' : 's'}</span>
					</a>
				</li>
			{/each}
		</ol>

		{#if data.modules.length === 0}
			<p class="empty">No modules yet — check back soon.</p>
		{/if}
	{/if}
</section>

<style>
	.course-index {
		max-inline-size: 68ch;
		margin-inline: auto;
		padding-block: 2rem;
	}
	.gate {
		border: 1px solid oklch(85% 0.02 270);
		border-radius: 0.75rem;
		padding: 2rem;
		text-align: center;
	}
	.cta {
		display: inline-block;
		margin-block-start: 1rem;
		padding: 0.75rem 1.5rem;
		background: oklch(55% 0.18 265);
		color: oklch(99% 0 0);
		border-radius: 0.5rem;
		text-decoration: none;
	}
	.modules {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 0.5rem;
	}
	.module-row a {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 1rem;
		align-items: center;
		padding: 1rem;
		border: 1px solid oklch(90% 0.01 270);
		border-radius: 0.5rem;
		text-decoration: none;
		color: inherit;
	}
	.module-row a:hover {
		border-color: oklch(55% 0.18 265);
	}
	.index {
		font-variant-numeric: tabular-nums;
		color: oklch(60% 0.02 270);
	}
	.count {
		color: oklch(55% 0.02 270);
		font-size: 0.875rem;
	}
	.empty {
		color: oklch(55% 0.02 270);
	}
</style>
