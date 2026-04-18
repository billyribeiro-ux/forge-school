/**
 * Stripe client factory for dev scripts.
 *
 * Scripts run outside SvelteKit, so `$env/static/private` isn't available.
 * We read STRIPE_SECRET_KEY from process.env (after loadEnv) and apply
 * the same test-key guard as src/lib/server/stripe/client.ts — scripts
 * must never hit live Stripe.
 */
import Stripe from 'stripe';

export function createStripe(scriptName: string): Stripe {
	const key = process.env['STRIPE_SECRET_KEY'];
	if (key === undefined || key === '' || key === 'sk_test_replace_me') {
		console.error(`[${scriptName}] STRIPE_SECRET_KEY is not set. Fill in .env.local.`);
		process.exit(1);
	}
	if (!key.startsWith('sk_test_')) {
		console.error(
			`[${scriptName}] STRIPE_SECRET_KEY must start with "sk_test_" (got "${key.slice(0, 8)}..."). ` +
				'Dev scripts never hit live Stripe.'
		);
		process.exit(1);
	}
	return new Stripe(key, {
		apiVersion: '2026-03-25.dahlia',
		appInfo: { name: 'forgeschool-seed', version: '0.0.1' },
		typescript: true
	});
}
