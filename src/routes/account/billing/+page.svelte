<script lang="ts">
	import PastDueWarning from '$lib/components/entitlement/PastDueWarning.svelte';
	import RenewalBanner from '$lib/components/entitlement/RenewalBanner.svelte';
	import TrialCountdown from '$lib/components/entitlement/TrialCountdown.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function formatCents(cents: number, currency: string): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency.toUpperCase(),
			maximumFractionDigits: cents % 100 === 0 ? 0 : 2
		}).format(cents / 100);
	}

	function formatDate(d: Date | string | null): string {
		if (d === null) return '—';
		const date = typeof d === 'string' ? new Date(d) : d;
		return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
	}
</script>

<svelte:head>
	<title>Billing — ForgeSchool</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="billing">
	<header>
		<h1>Billing</h1>
		<p class="session-ref">Session <code>{data.sessionId.slice(0, 8)}…</code></p>
	</header>

	<section class="card">
		<header class="card-header">
			<h2>Subscriptions</h2>
			{#if data.subscriptions.length > 0}
				<form method="POST" action="/account/billing/portal">
					<button type="submit" class="portal-btn">Manage in Stripe</button>
				</form>
			{/if}
		</header>

		{#if data.subscriptions.length === 0}
			<p class="empty">No subscriptions yet. Visit <a href="/pricing">/pricing</a> to start one.</p>
		{:else}
			<ul class="list">
				{#each data.subscriptions as sub (sub.id)}
					<li class="row">
						<div class="row-main">
							<p class="row-title">{sub.product.name}</p>
							<p class="row-meta">
								{formatCents(sub.price.unitAmountCents, sub.price.currency)} /
								{sub.price.interval === 'year' ? 'year' : 'month'}
							</p>
							<div class="row-banners">
								{#if sub.status === 'past_due' || sub.status === 'unpaid'}
									<PastDueWarning
										subscriptionId={sub.id}
										updatePaymentUrl="/account/billing"
									/>
								{/if}
								{#if sub.status === 'trialing' && sub.trialEnd !== null}
									<TrialCountdown
										trialEnd={sub.trialEnd}
										trialLengthDays={sub.price.trialPeriodDays ?? 14}
									/>
								{/if}
								{#if (sub.status === 'active' || sub.status === 'trialing') && sub.currentPeriodEnd !== null}
									<RenewalBanner
										currentPeriodEnd={sub.currentPeriodEnd}
										cancelAtPeriodEnd={sub.cancelAtPeriodEnd}
									/>
								{/if}
							</div>
						</div>
						<div class="row-side">
							<span class="status status-{sub.status}">{sub.status.replace('_', ' ')}</span>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="card">
		<header class="card-header"><h2>Purchase history</h2></header>
		{#if data.payments.length === 0}
			<p class="empty">No completed purchases.</p>
		{:else}
			<ul class="list">
				{#each data.payments as payment (payment.id)}
					<li class="row">
						<div class="row-main">
							<p class="row-title">Payment</p>
							<p class="row-meta">
								{formatDate(payment.paidAt ?? payment.createdAt)} ·
								<code>{payment.stripePaymentIntentId.slice(0, 20)}…</code>
							</p>
						</div>
						<div class="row-side">
							<p class="amount">{formatCents(payment.amountCents, payment.currency)}</p>
							<p class="row-meta">{payment.status}</p>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="card">
		<header class="card-header"><h2>Active entitlements</h2></header>
		{#if data.entitlements.length === 0}
			<p class="empty">No active entitlements.</p>
		{:else}
			<ul class="list">
				{#each data.entitlements as ent (ent.id)}
					<li class="row small">
						<p class="row-meta">
							Source: <strong>{ent.source}</strong> · granted {formatDate(ent.grantedAt)}
						</p>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</main>

<style>
	@layer components {
		.billing {
			max-inline-size: 56rem;
			margin-inline: auto;
			padding-inline: 1.5rem;
			padding-block: 3rem;
			display: grid;
			gap: 1.5rem;
		}
		h1 {
			font-size: var(--font-size-3xl);
			margin-block-end: 0.25rem;
		}
		.session-ref {
			font-size: var(--font-size-sm);
			color: var(--color-fg-subtle);
		}
		.card {
			padding: 1.5rem;
			border: 1px solid var(--color-border);
			border-radius: var(--radius-lg);
			background-color: var(--color-bg-raised);
		}
		.card-header {
			display: flex;
			justify-content: space-between;
			align-items: baseline;
			margin-block-end: 1rem;
			gap: 1rem;
		}
		.card-header h2 {
			font-size: var(--font-size-xl);
		}
		.portal-btn {
			background-color: var(--color-brand);
			color: var(--color-brand-fg);
			border: 0;
			padding-inline: 1rem;
			padding-block: 0.5rem;
			border-radius: var(--radius-md);
			font-weight: var(--font-weight-medium);
			cursor: pointer;
		}
		.portal-btn:hover {
			background-color: var(--color-brand-hover);
		}
		.empty {
			color: var(--color-fg-muted);
			font-size: var(--font-size-sm);
		}
		.list {
			list-style: none;
			padding: 0;
			margin: 0;
			display: grid;
			gap: 0.75rem;
		}
		.row {
			display: flex;
			justify-content: space-between;
			align-items: flex-start;
			gap: 1rem;
			padding: 0.75rem 1rem;
			border: 1px solid var(--color-border);
			border-radius: var(--radius-md);
		}
		.row.small {
			padding-block: 0.5rem;
		}
		.row-main {
			flex: 1;
		}
		.row-title {
			font-weight: var(--font-weight-semibold);
		}
		.row-meta {
			font-size: var(--font-size-sm);
			color: var(--color-fg-muted);
		}
		.row-meta.warning {
			color: var(--color-warning-700);
		}
		.row-banners {
			margin-block-start: 0.75rem;
			display: grid;
			gap: 0.5rem;
		}
		.row-side {
			text-align: end;
		}
		.amount {
			font-size: var(--font-size-lg);
			font-weight: var(--font-weight-semibold);
			font-variant-numeric: tabular-nums;
		}
		.status {
			display: inline-block;
			padding-inline: 0.5rem;
			padding-block: 0.15rem;
			border-radius: var(--radius-sm);
			font-size: var(--font-size-xs);
			font-weight: var(--font-weight-semibold);
			text-transform: uppercase;
			letter-spacing: var(--letter-spacing-wide);
		}
		.status-active,
		.status-trialing {
			background-color: var(--color-success-50);
			color: var(--color-success-700);
		}
		.status-past_due,
		.status-unpaid {
			background-color: var(--color-warning-50);
			color: var(--color-warning-700);
		}
		.status-cancelled,
		.status-paused {
			background-color: var(--color-bg-sunken);
			color: var(--color-fg-muted);
		}
	}
</style>
