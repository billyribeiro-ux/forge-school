<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Account — ForgeSchool</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="account">
	<header>
		<h1>Your account</h1>
		<p class="session-ref">Session <code>{data.sessionId.slice(0, 8)}…</code></p>
	</header>

	<section class="tier-card">
		<p class="eyebrow">Current plan</p>
		<p class="tier" data-tier={data.tier}>
			<span class="tier-label">{data.tierLabel}</span>
			<span class="tier-meta">
				{data.entitlementCount}
				{data.entitlementCount === 1 ? 'active entitlement' : 'active entitlements'}
			</span>
		</p>
		{#if data.tier === 'free'}
			<a class="cta" href="/pricing">Upgrade to Pro →</a>
		{/if}
	</section>

	<nav class="links" aria-label="Account sections">
		<a class="link" href="/account/billing">
			<span class="link-title">Billing</span>
			<span class="link-sub">Plans, purchases, payment method.</span>
		</a>
		<a class="link" href="/course">
			<span class="link-title">Course access</span>
			<span class="link-sub">
				{data.tier === 'free' ? 'Locked — upgrade to open.' : 'Open your course content.'}
			</span>
		</a>
		<a class="link" href="/cart">
			<span class="link-title">Cart</span>
			<span class="link-sub">Review items before checkout.</span>
		</a>
	</nav>
</main>

<style>
	@layer components {
		.account {
			max-inline-size: 52rem;
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
		.tier-card {
			padding: 1.5rem;
			border: 1px solid var(--color-border);
			border-radius: var(--radius-lg);
			background-color: var(--color-bg-raised);
			display: grid;
			gap: 0.5rem;
		}
		.tier-card:has([data-tier='lifetime']) {
			border-color: var(--color-brand);
		}
		.eyebrow {
			font-size: var(--font-size-xs);
			letter-spacing: var(--letter-spacing-widest);
			text-transform: uppercase;
			color: var(--color-fg-muted);
			margin: 0;
		}
		.tier {
			display: flex;
			align-items: baseline;
			gap: 1rem;
			margin: 0;
		}
		.tier-label {
			font-size: var(--font-size-3xl);
			font-weight: var(--font-weight-bold);
		}
		.tier[data-tier='pro'] .tier-label {
			color: var(--color-brand);
		}
		.tier[data-tier='lifetime'] .tier-label {
			color: var(--color-brand);
		}
		.tier-meta {
			color: var(--color-fg-muted);
			font-size: var(--font-size-sm);
		}
		.cta {
			display: inline-block;
			background-color: var(--color-brand);
			color: var(--color-brand-fg);
			padding-inline: 1rem;
			padding-block: 0.5rem;
			border-radius: var(--radius-md);
			font-weight: var(--font-weight-medium);
			text-decoration: none;
			justify-self: start;
			margin-block-start: 0.5rem;
		}
		.cta:hover {
			background-color: var(--color-brand-hover);
		}
		.links {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
			gap: 0.75rem;
		}
		.link {
			padding: 1rem;
			border: 1px solid var(--color-border);
			border-radius: var(--radius-md);
			background-color: var(--color-bg-raised);
			color: var(--color-fg);
			text-decoration: none;
			display: grid;
			gap: 0.25rem;
			transition: border-color var(--duration-fast) var(--easing-standard);
		}
		.link:hover {
			border-color: var(--color-brand);
		}
		.link-title {
			font-weight: var(--font-weight-semibold);
		}
		.link-sub {
			font-size: var(--font-size-sm);
			color: var(--color-fg-muted);
		}
	}
</style>
