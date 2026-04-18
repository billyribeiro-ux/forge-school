import { expect, test } from '@playwright/test';

/**
 * Verifies the refund → entitlement revocation flow at the **DB level**
 * using a seeded persona whose entitlement is already revoked via
 * seed-personas.ts ('lifetime-refunded'). This test exercises the UI
 * side (/account/billing) rendering a revoked state, not the Stripe
 * side (which has its own webhook coverage).
 *
 * Full end-to-end with real Stripe refunds requires operator actions
 * in the Stripe dashboard and is covered by the manual smoke in
 * lesson 046 + the webhook handler unit tests in lesson 053.
 */
test('refunded purchase persona renders no active entitlement', async ({ page, context }) => {
	await context.addCookies([
		{
			name: 'forge_session',
			value: 'persona-lifetime-refunded',
			domain: 'localhost',
			path: '/',
			httpOnly: false,
			secure: false,
			sameSite: 'Lax'
		}
	]);

	await page.goto('/account/billing');

	// The purchase history card shows the refunded payment with status=refunded.
	const history = page.locator('section.card', { hasText: 'Purchase history' });
	await expect(history.getByText('refunded')).toBeVisible();

	// The active-entitlements card should be empty — the seed revoked the row.
	const entitlementsCard = page.locator('section.card', { hasText: 'Active entitlements' });
	await expect(entitlementsCard.getByText('No active entitlements.')).toBeVisible();
});
