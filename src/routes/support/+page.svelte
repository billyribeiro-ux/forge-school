<svelte:head>
	<title>Support — ForgeSchool</title>
	<meta name="description" content="Get help with ForgeSchool." />
</svelte:head>

<main class="prose">
	<header>
		<p class="eyebrow">Support</p>
		<h1>We respond within one business day.</h1>
	</header>

	<p>
		Billing, refunds, access problems, or feedback — email <a
			href="mailto:support@forgeschool.dev">support@forgeschool.dev</a
		>.
	</p>

	<h2>Include in your email</h2>
	<ul>
		<li>Your session id (visible at <a href="/account">/account</a> — first 8 characters).</li>
		<li>The URL where the issue occurred.</li>
		<li>A screenshot or error text if applicable.</li>
		<li>The browser + OS you're on.</li>
	</ul>

	<h2>Common fixes before you email</h2>
	<ul>
		<li>Clear cookies for forgeschool.dev and retry — most auth-free session drift resolves here.</li>
		<li>
			If a subscription shows <code>past_due</code>, update your card at
			<a href="/account/billing">/account/billing</a>.
		</li>
		<li>Check <a href="/refund-policy">/refund-policy</a> for the refund window.</li>
	</ul>
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
		p,
		li {
			color: var(--color-fg-muted);
		}
		ul {
			padding-inline-start: 1.5rem;
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
