<!--
	TrialCountdown — trial-period progress indicator.

	Shows "N days left in trial" with a progress bar filled in proportion
	to how much of the trial is consumed. Defaults the trial length to
	14 days (matches our Pro Yearly trial); pass `trialLengthDays` to
	override for monthly (7 days).

	Hides itself entirely when the trial has ended, so callers can
	render unconditionally.
-->
<script lang="ts">
	type Props = {
		trialEnd: Date;
		trialLengthDays?: number;
	};

	let { trialEnd, trialLengthDays = 14 }: Props = $props();

	const msPerDay = 1000 * 60 * 60 * 24;

	const daysLeftRaw = $derived((trialEnd.getTime() - Date.now()) / msPerDay);
	const daysLeft = $derived(Math.max(0, Math.ceil(daysLeftRaw)));
	const elapsedDays = $derived(Math.max(0, trialLengthDays - daysLeft));
	const percentElapsed = $derived(
		Math.min(100, Math.max(0, (elapsedDays / trialLengthDays) * 100))
	);
	const ended = $derived(daysLeftRaw <= 0);
</script>

{#if !ended}
	<section class="trial" aria-label="Free trial status">
		<div class="row">
			<p class="label">
				{daysLeft}
				{daysLeft === 1 ? 'day' : 'days'} left in your free trial
			</p>
			<p class="percent">{Math.round(percentElapsed)}%</p>
		</div>
		<div
			class="bar"
			role="progressbar"
			aria-valuenow={Math.round(percentElapsed)}
			aria-valuemin={0}
			aria-valuemax={100}
		>
			<div class="fill" style:inline-size="{percentElapsed}%"></div>
		</div>
	</section>
{/if}

<style>
	@layer components {
		.trial {
			padding: 0.75rem 1rem;
			border: 1px solid var(--color-border);
			border-radius: var(--radius-md);
			background-color: var(--color-bg-raised);
		}
		.row {
			display: flex;
			justify-content: space-between;
			align-items: baseline;
			margin-block-end: 0.35rem;
		}
		.label {
			margin: 0;
			font-size: var(--font-size-sm);
			color: var(--color-fg);
		}
		.percent {
			margin: 0;
			font-size: var(--font-size-xs);
			font-variant-numeric: tabular-nums;
			color: var(--color-fg-muted);
		}
		.bar {
			block-size: 6px;
			background-color: var(--color-bg-sunken);
			border-radius: var(--radius-full);
			overflow: hidden;
		}
		.fill {
			block-size: 100%;
			background-color: var(--color-brand);
			transition: inline-size 300ms var(--easing-standard, ease-out);
		}
		@media (prefers-reduced-motion: reduce) {
			.fill {
				transition: none;
			}
		}
	}
</style>
