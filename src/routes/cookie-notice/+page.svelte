<svelte:head>
	<title>Cookie notice — ForgeSchool</title>
	<meta name="description" content="The cookies ForgeSchool sets and why." />
</svelte:head>

<main class="prose">
	<header>
		<p class="eyebrow">Legal</p>
		<h1>Cookie notice</h1>
	</header>

	<p>
		ForgeSchool sets first-party cookies. No third-party ad or tracking cookies. No consent
		banner is required for strictly-necessary functional cookies under the rules we operate
		under; see the list below.
	</p>

	<h2>The full list</h2>

	<dl class="cookies">
		<div>
			<dt><code>forge_session</code></dt>
			<dd>
				Anonymous UUID used as the principal for carts, orders, subscriptions, and
				entitlements. 1-year max-age.
			</dd>
		</div>
		<div>
			<dt><code>forge_cart</code></dt>
			<dd>
				Your in-flight cart (line items + quantities). 30-day max-age. Cleared when your cart is
				empty.
			</dd>
		</div>
		<div>
			<dt><code>forge_coupon</code></dt>
			<dd>Applied coupon code at checkout time. 7-day max-age.</dd>
		</div>
		<div>
			<dt>Stripe-managed cookies</dt>
			<dd>
				When you reach the Stripe Checkout page, Stripe sets cookies to protect the payment
				session. Governed by Stripe's privacy policy.
			</dd>
		</div>
	</dl>
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
		.cookies {
			display: grid;
			gap: 1rem;
			margin: 0;
		}
		.cookies div {
			padding: 1rem;
			border: 1px solid var(--color-border);
			border-radius: var(--radius-md);
			background-color: var(--color-bg-raised);
		}
		dt {
			font-weight: var(--font-weight-semibold);
			margin-block-end: 0.4rem;
		}
		dd {
			color: var(--color-fg-muted);
			margin: 0;
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
