<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Thank you — ForgeSchool</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="success">
	<div class="inner">
		<p class="eyebrow">Payment received</p>
		<h1>Thanks — we're processing your order.</h1>
		<p class="lede">
			Stripe confirmed the payment. Access gets activated by a webhook, which usually fires within
			a few seconds. You'll see it appear in
			<a href="/account/billing">your billing area</a>
			and — for course content — at <a href="/lessons">the curriculum</a>.
		</p>
		{#if data.sessionId !== null}
			<p class="ref">
				Reference: <code>{data.sessionId}</code>
			</p>
		{/if}
		<p class="support">
			Something's off? Reply to the confirmation email or write to <a
				href="mailto:support@forgeschool.dev">support@forgeschool.dev</a
			> with the reference above.
		</p>

		<div class="cta-row">
			<a class="cta primary" href="/lessons">Open the curriculum</a>
			<a class="cta secondary" href="/account/billing">Billing details</a>
		</div>
	</div>
</main>

<style>
	@layer components {
		.success {
			max-inline-size: 40rem;
			margin-inline: auto;
			padding-inline: 1.5rem;
			padding-block: 4rem;
			text-align: center;
		}

		.eyebrow {
			font-size: var(--font-size-xs);
			letter-spacing: var(--letter-spacing-widest);
			text-transform: uppercase;
			color: var(--color-success-700);
			font-weight: var(--font-weight-semibold);
			margin-block-end: 0.5rem;
		}

		h1 {
			font-size: var(--font-size-3xl);
			margin-block-end: 1rem;
		}

		.lede,
		.support {
			color: var(--color-fg-muted);
			line-height: var(--line-height-relaxed);
			margin-block-end: 1rem;
		}

		.ref {
			font-size: var(--font-size-sm);
			color: var(--color-fg-subtle);
			margin-block: 1rem;
		}

		.ref code {
			font-size: var(--font-size-xs);
		}

		.cta-row {
			display: flex;
			gap: 0.75rem;
			justify-content: center;
			margin-block-start: 1.5rem;
			flex-wrap: wrap;
		}

		.cta {
			padding-inline: 1.25rem;
			padding-block: 0.75rem;
			border-radius: var(--radius-md);
			text-decoration: none;
			font-weight: var(--font-weight-medium);
		}

		.cta.primary {
			background-color: var(--color-brand);
			color: var(--color-brand-fg);
		}

		.cta.primary:hover {
			background-color: var(--color-brand-hover);
		}

		.cta.secondary {
			border: 1px solid var(--color-border-strong);
			color: var(--color-fg);
		}
	}
</style>
