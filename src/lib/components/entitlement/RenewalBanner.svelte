<!--
	RenewalBanner — a subtle inline notice conveying renewal / cancellation state.

	Props:
	  currentPeriodEnd: Date — the end of the active billing window.
	  cancelAtPeriodEnd: boolean — Stripe's flag (user has clicked
	    cancel; the plan runs to period end then stops).

	Pure presentational. Callers load the subscription row and pass
	the two fields.
-->
<script lang="ts">
	type Props = {
		currentPeriodEnd: Date;
		cancelAtPeriodEnd: boolean;
	};

	let { currentPeriodEnd, cancelAtPeriodEnd }: Props = $props();

	function formatAbsoluteDate(d: Date): string {
		return new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(d);
	}

	function formatRelativeDays(target: Date, now: Date = new Date()): string {
		const msPerDay = 1000 * 60 * 60 * 24;
		const diffDays = Math.round((target.getTime() - now.getTime()) / msPerDay);
		if (diffDays <= 0) return 'today';
		if (diffDays === 1) return 'tomorrow';
		if (diffDays < 14) return `in ${diffDays} days`;
		if (diffDays < 45) return `in about ${Math.round(diffDays / 7)} weeks`;
		return `on ${formatAbsoluteDate(target)}`;
	}

	const message = $derived(
		cancelAtPeriodEnd
			? `Your plan ends on ${formatAbsoluteDate(currentPeriodEnd)}.`
			: `Renews ${formatRelativeDays(currentPeriodEnd)}.`
	);
</script>

<p class={['renewal', { cancelling: cancelAtPeriodEnd }]}>{message}</p>

<style>
	@layer components {
		.renewal {
			font-size: var(--font-size-sm);
			color: var(--color-fg-muted);
			padding-inline: 0.75rem;
			padding-block: 0.35rem;
			border-inline-start: 2px solid var(--color-border);
			margin: 0;
		}
		.renewal.cancelling {
			color: var(--color-fg);
			border-inline-start-color: var(--color-brand);
		}
	}
</style>
