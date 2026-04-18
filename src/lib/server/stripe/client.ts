/**
 * Typed Stripe client singleton.
 *
 * v1 of this codebase refuses to boot on anything other than Stripe
 * test keys (`sk_test_...`). The `assertTestKey` guard is the last
 * line of defense — if someone rotates `.env.local` to live keys, the
 * app crashes at import time with a clear error, before any request
 * ever reaches Stripe.
 *
 * Server-only. Importing from client code is a SvelteKit build error
 * because `$env/static/private` isn't reachable from the browser bundle.
 */
import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '$env/static/private';

function assertTestKey(key: string): void {
	if (key === '' || key === 'sk_test_replace_me') {
		throw new Error(
			'[stripe] STRIPE_SECRET_KEY is not set. Copy .env.example to .env.local and fill it in.'
		);
	}
	if (!key.startsWith('sk_test_')) {
		throw new Error(
			`[stripe] STRIPE_SECRET_KEY must start with "sk_test_" (got "${key.slice(0, 8)}..."). ` +
				'v1 of ForgeSchool runs test-mode only. See docs/STRIPE.md §1.'
		);
	}
}

assertTestKey(STRIPE_SECRET_KEY);

// Pinning `apiVersion` freezes Stripe's request/response contract at the
// date we wire Stripe in. Stripe rolls breaking changes behind new API
// versions; our code can opt in to newer versions via a deliberate bump.
// Do not leave this as the SDK default — the default drifts with SDK
// upgrades and can silently introduce field renames.
export const stripe = new Stripe(STRIPE_SECRET_KEY, {
	apiVersion: '2026-03-25.dahlia',
	appInfo: {
		name: 'forgeschool',
		version: '0.0.1'
	},
	typescript: true
});

export type StripeClient = typeof stripe;
