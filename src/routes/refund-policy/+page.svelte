<svelte:head>
	<title>Refund policy — ForgeSchool</title>
	<meta name="description" content="ForgeSchool refund policy." />
</svelte:head>

<main class="prose">
	<header>
		<p class="eyebrow">Legal</p>
		<h1>Refund policy</h1>
	</header>

	<h2>Lifetime purchases</h2>
	<p>
		14-day, no-questions-asked money-back guarantee. Email us; we process refunds via Stripe
		within one business day. Your lifetime entitlement is revoked on refund.
	</p>

	<h2>Subscriptions</h2>
	<p>
		Cancel any time from <a href="/account/billing">/account/billing</a>. Cancellation stops
		future charges; we don't prorate the current billing period — you keep access until the
		period ends.
	</p>

	<h2>Failed payments</h2>
	<p>
		If Stripe can't charge your card, we send a reminder and retry. After three failures the
		subscription transitions to <code>past_due</code> and, eventually, <code>unpaid</code> —
		access revokes at that point. Update your card to resume.
	</p>

	<h2>Chargebacks</h2>
	<p>
		If you file a chargeback instead of requesting a refund, your access is revoked immediately
		and the account flagged. We generally don't contest refund-eligible chargebacks; we do
		contest fraudulent ones.
	</p>
</main>

<style>
	@layer components {
		.prose {
			max-inline-size: 48rem;
			margin-inline: auto;
			padding-inline: 1.5rem;
			padding-block: 3rem;
			line-height: var(--line-height-relaxed);
		}
		.eyebrow {
			font-size: var(--font-size-xs);
			letter-spacing: var(--letter-spacing-widest);
			text-transform: uppercase;
			color: var(--color-brand);
			font-weight: var(--font-weight-semibold);
		}
		h1 {
			font-size: var(--font-size-3xl);
			margin-block: 0.5rem 2rem;
		}
		h2 {
			font-size: var(--font-size-lg);
			margin-block: 1.5rem 0.5rem;
		}
		p {
			color: var(--color-fg-muted);
			margin-block-end: 1rem;
		}
		code {
			font-family: var(--font-mono);
			font-size: 0.95em;
			background-color: var(--color-bg-sunken);
			padding-inline: 0.3rem;
			border-radius: var(--radius-sm);
		}
	}
</style>
