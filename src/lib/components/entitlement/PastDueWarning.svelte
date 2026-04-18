<!--
	PastDueWarning — urgent alert rendered when a subscription is
	`past_due` (Stripe couldn't charge the saved card; grace period
	before the subscription transitions to `unpaid` and we revoke).

	Redundant-signal accessibility: color + icon + heading + role="alert".
	Screen readers announce assertively.

	Caller passes `updatePaymentUrl` — typically the output of POST
	/account/billing/portal (lesson 055), which is the Stripe Billing
	Portal URL where the user can update their card.
-->
<script lang="ts">
	type Props = {
		subscriptionId: string;
		updatePaymentUrl: string;
	};

	let { subscriptionId, updatePaymentUrl }: Props = $props();
</script>

<aside
	class="past-due"
	role="alert"
	aria-live="assertive"
	data-subscription-id={subscriptionId}
>
	<div class="icon" aria-hidden="true">!</div>
	<div class="body">
		<h3 class="heading">Payment failed</h3>
		<p class="copy">
			We couldn't charge your card for the latest invoice. Update your payment method to keep
			access.
		</p>
	</div>
	<a class="cta" href={updatePaymentUrl}>Update payment →</a>
</aside>

<style>
	@layer components {
		.past-due {
			display: grid;
			grid-template-columns: auto 1fr auto;
			align-items: center;
			gap: 1rem;
			padding: 1rem 1.25rem;
			background-color: var(--color-bg-raised);
			border: 1px solid var(--color-danger, var(--color-brand));
			border-inline-start-width: 4px;
			border-radius: var(--radius-lg);
			animation: pulse 2.5s var(--easing-standard, ease-in-out) infinite;
		}
		@media (prefers-reduced-motion: reduce) {
			.past-due {
				animation: none;
			}
		}
		@keyframes pulse {
			0%,
			100% {
				box-shadow: 0 0 0 0 transparent;
			}
			50% {
				box-shadow: 0 0 0 4px var(--color-bg-sunken);
			}
		}
		.icon {
			inline-size: 2rem;
			block-size: 2rem;
			display: grid;
			place-items: center;
			border-radius: var(--radius-full);
			background-color: var(--color-danger, var(--color-brand));
			color: var(--color-brand-fg);
			font-weight: var(--font-weight-bold);
		}
		.heading {
			margin: 0;
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-semibold);
		}
		.copy {
			margin: 0.15rem 0 0;
			color: var(--color-fg-muted);
			font-size: var(--font-size-sm);
		}
		.cta {
			background-color: var(--color-danger, var(--color-brand));
			color: var(--color-brand-fg);
			padding-inline: 0.875rem;
			padding-block: 0.5rem;
			border-radius: var(--radius-md);
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-semibold);
			text-decoration: none;
		}
		.cta:hover {
			filter: brightness(1.1);
		}
	}
</style>
