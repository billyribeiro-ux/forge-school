<svelte:head>
	<title>Terms of service — ForgeSchool</title>
	<meta name="description" content="ForgeSchool terms of service." />
</svelte:head>

<main class="prose">
	<header>
		<p class="eyebrow">Legal</p>
		<h1>Terms of service</h1>
		<p class="updated">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
	</header>

	<p>
		These Terms govern your use of ForgeSchool. By purchasing access or browsing the platform, you
		agree to these Terms.
	</p>

	<h2>Access</h2>
	<p>
		Purchase grants a non-transferable license to access the curriculum. You retain copyright in
		any code you write as part of completing the lessons.
	</p>

	<h2>Refunds</h2>
	<p>
		See <a href="/refund-policy">/refund-policy</a> for full terms. In summary: 14-day
		money-back guarantee on lifetime purchases; subscriptions cancellable any time; refund of
		prorated balance is not provided.
	</p>

	<h2>Acceptable use</h2>
	<p>
		Don't scrape. Don't redistribute. Don't resell access. Don't share login credentials. Doing
		any of these terminates access without refund.
	</p>

	<h2>Liability</h2>
	<p>
		ForgeSchool is a learning product. Shipped systems are your responsibility. We don't warrant
		that following the lessons produces a defect-free application. Test your own code.
	</p>

	<h2>Contact</h2>
	<p>Questions: <a href="/contact">/contact</a>.</p>
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
			margin-block: 0.5rem 0.5rem;
		}
		.updated {
			color: var(--color-fg-subtle);
			font-size: var(--font-size-sm);
			margin-block-end: 2rem;
		}
		h2 {
			font-size: var(--font-size-lg);
			margin-block: 1.5rem 0.5rem;
		}
		p {
			color: var(--color-fg-muted);
			margin-block-end: 1rem;
		}
	}
</style>
