<!--
	UpgradePrompt — entitlement-gate UI for Pro features.

	Rendered when a user tries to access a feature their tier doesn't
	include. Purely presentational — it takes the name of the gated
	feature and a pricing href. All routing and policy lives upstream.
-->
<script lang="ts">
	type Props = {
		featureName: string;
		href?: string | undefined;
		onDismiss?: (() => void) | undefined;
	};

	let { featureName, href = '/pricing', onDismiss }: Props = $props();
</script>

<aside class="upgrade-prompt" role="status" aria-live="polite">
	<div class="icon" aria-hidden="true">▲</div>
	<div class="body">
		<h3 class="heading">Pro feature</h3>
		<p class="copy">{featureName} requires a Pro plan.</p>
	</div>
	<div class="actions">
		<a class="cta" {href}>See plans →</a>
		{#if onDismiss !== undefined}
			<button
				type="button"
				class="dismiss"
				aria-label="Dismiss upgrade prompt"
				onclick={() => onDismiss?.()}
			>
				×
			</button>
		{/if}
	</div>
</aside>

<style>
	@layer components {
		.upgrade-prompt {
			display: grid;
			grid-template-columns: auto 1fr auto;
			align-items: center;
			gap: 1rem;
			padding: 1rem 1.25rem;
			background-color: var(--color-bg-raised);
			border: 1px solid var(--color-brand);
			border-radius: var(--radius-lg);
			animation: slide-in 200ms var(--easing-standard, ease-out);
		}
		@media (prefers-reduced-motion: reduce) {
			.upgrade-prompt {
				animation: none;
			}
		}
		@keyframes slide-in {
			from {
				opacity: 0;
				transform: translateY(8px);
			}
			to {
				opacity: 1;
				transform: translateY(0);
			}
		}
		.icon {
			inline-size: 2rem;
			block-size: 2rem;
			display: grid;
			place-items: center;
			border-radius: var(--radius-full);
			background-color: var(--color-bg-sunken);
			color: var(--color-brand);
			font-weight: var(--font-weight-bold);
		}
		.heading {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-semibold);
			margin: 0;
		}
		.copy {
			margin-block-start: 0.15rem;
			margin-block-end: 0;
			color: var(--color-fg-muted);
			font-size: var(--font-size-sm);
		}
		.actions {
			display: inline-flex;
			align-items: center;
			gap: 0.5rem;
		}
		.cta {
			background-color: var(--color-brand);
			color: var(--color-brand-fg);
			padding-inline: 0.875rem;
			padding-block: 0.5rem;
			border-radius: var(--radius-md);
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-semibold);
			text-decoration: none;
		}
		.cta:hover {
			background-color: var(--color-brand-hover);
		}
		.dismiss {
			background: transparent;
			border: 0;
			color: var(--color-fg-subtle);
			font-size: var(--font-size-lg);
			cursor: pointer;
			padding-inline: 0.4rem;
			padding-block: 0.1rem;
		}
		.dismiss:hover {
			color: var(--color-fg);
		}
	}
</style>
