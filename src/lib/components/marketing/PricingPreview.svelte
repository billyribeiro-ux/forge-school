<!--
	PricingPreview — three-plan teaser on the landing.

	Static copy (plan names + "from" anchor prices). Live amounts live
	on /pricing where the DB is the source of truth. This component is
	intentionally prerender-safe: zero load() dependency, zero $env reads.

	If the underlying prices change, update both this file AND /pricing's
	seed entries — they are the two human-readable sources of plan copy.
-->
<script lang="ts">
	import RevealOnScroll from './RevealOnScroll.svelte';

	type Plan = {
		slug: string;
		eyebrow: string;
		name: string;
		anchor: string;
		lede: string;
		features: readonly string[];
		highlight?: boolean;
	};

	const plans: readonly Plan[] = [
		{
			slug: 'forgeschool-pro-monthly',
			eyebrow: 'Pay as you go',
			name: 'Pro Monthly',
			anchor: 'from $49 / month',
			lede: '7-day free trial. Cancel any time.',
			features: ['Every lesson', 'Every future module', 'Cancel any time']
		},
		{
			slug: 'forgeschool-pro-yearly',
			eyebrow: 'Best value',
			name: 'Pro Yearly',
			anchor: 'from $497 / year',
			lede: '14-day free trial. Two months free vs monthly.',
			features: ['Every lesson', 'Every future module', '14-day trial', 'Save vs monthly'],
			highlight: true
		},
		{
			slug: 'forgeschool-lifetime',
			eyebrow: 'One time',
			name: 'Lifetime',
			anchor: 'from $497',
			lede: 'One-time purchase, permanent access.',
			features: ['Every lesson', 'Every future module', 'No renewal']
		}
	];
</script>

<section class="pricing-preview" aria-labelledby="pricing-preview-heading">
	<div class="inner">
		<RevealOnScroll>
			<p class="eyebrow">Pricing</p>
			<h2 id="pricing-preview-heading">Three ways to learn.</h2>
			<p class="lede">
				Pick the cadence that matches how you work. All plans unlock every lesson and every future
				module.
			</p>
		</RevealOnScroll>
		<ol class="grid">
			{#each plans as plan, i (plan.slug)}
				<RevealOnScroll delayMs={i * 80}>
					<li class="plan" class:highlight={plan.highlight === true}>
						<p class="plan-eyebrow">{plan.eyebrow}</p>
						<h3 class="plan-name">{plan.name}</h3>
						<p class="plan-anchor">{plan.anchor}</p>
						<p class="plan-lede">{plan.lede}</p>
						<ul class="features">
							{#each plan.features as feature (feature)}
								<li>{feature}</li>
							{/each}
						</ul>
						<a class="plan-cta" href="/pricing#{plan.slug}">See details →</a>
					</li>
				</RevealOnScroll>
			{/each}
		</ol>
		<p class="all-link">
			<a href="/pricing">Compare every plan side-by-side →</a>
		</p>
	</div>
</section>

<style>
	@layer components {
		.pricing-preview {
			padding: 4rem 1.5rem;
			background-color: var(--color-bg);
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
			margin-block: 0.5rem;
		}
		.lede {
			text-align: center;
			color: var(--color-fg-muted);
			max-inline-size: 36rem;
			margin: 0.5rem auto 2.5rem;
		}
		.grid {
			list-style: none;
			padding: 0;
			margin: 0 0 2rem;
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
			gap: 1rem;
		}
		.plan {
			padding: 1.75rem;
			border: 1px solid var(--color-border);
			border-radius: var(--radius-lg);
			background-color: var(--color-bg-raised);
			display: flex;
			flex-direction: column;
		}
		.plan.highlight {
			border-color: var(--color-brand);
			box-shadow: 0 0 0 1px var(--color-brand);
		}
		.plan-eyebrow {
			font-size: var(--font-size-xs);
			letter-spacing: var(--letter-spacing-widest);
			text-transform: uppercase;
			color: var(--color-fg-muted);
			margin: 0 0 0.5rem;
		}
		.plan.highlight .plan-eyebrow {
			color: var(--color-brand);
		}
		.plan-name {
			font-size: var(--font-size-xl);
			margin-block: 0 0.5rem;
		}
		.plan-anchor {
			font-size: var(--font-size-lg);
			font-weight: var(--font-weight-semibold);
			font-variant-numeric: tabular-nums;
			margin-block: 0 0.5rem;
		}
		.plan-lede {
			font-size: var(--font-size-sm);
			color: var(--color-fg-muted);
			margin-block-end: 1rem;
		}
		.features {
			list-style: none;
			padding: 0;
			margin: 0 0 1.5rem;
			display: grid;
			gap: 0.4rem;
			font-size: var(--font-size-sm);
			color: var(--color-fg);
			flex: 1;
		}
		.features li::before {
			content: '✓';
			color: var(--color-brand);
			margin-inline-end: 0.5rem;
			font-weight: var(--font-weight-semibold);
		}
		.plan-cta {
			align-self: start;
			font-size: var(--font-size-sm);
			color: var(--color-brand);
			text-decoration: none;
			font-weight: var(--font-weight-medium);
		}
		.plan-cta:hover {
			text-decoration: underline;
		}
		.all-link {
			text-align: center;
			margin: 0;
		}
		.all-link a {
			color: var(--color-fg-muted);
			text-decoration: none;
		}
		.all-link a:hover {
			color: var(--color-brand);
		}
	}
</style>
