<svelte:head>
	<title>Privacy policy — ForgeSchool</title>
	<meta name="description" content="ForgeSchool privacy policy." />
</svelte:head>

<main class="prose">
	<header>
		<p class="eyebrow">Legal</p>
		<h1>Privacy policy</h1>
	</header>

	<p>
		ForgeSchool respects your privacy. This policy describes what we collect, why, and how long
		we keep it.
	</p>

	<h2>What we collect</h2>
	<p>
		We issue an anonymous session cookie (<code>forge_session</code>) on first visit. It's a
		random UUID — no personal data. Stripe, when you check out, collects payment details
		directly; we never see your card number.
	</p>

	<h2>Analytics</h2>
	<p>
		Page views go to Plausible when configured — no cookies, no cross-site tracking, no
		fingerprinting. Aggregate counts only.
	</p>

	<h2>Third parties</h2>
	<p>Stripe (payments), Resend (transactional email), Plausible (analytics). That's the list.</p>

	<h2>Your rights</h2>
	<p>
		Email us to request deletion of your data. Anonymous sessions have no account, so the
		request typically resolves by invalidating the cookie on your device.
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
