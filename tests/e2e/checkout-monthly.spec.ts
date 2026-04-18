import { expect, test } from '@playwright/test';

/**
 * Monthly subscription checkout.
 *
 * Scope: verify our UI flows (/pricing form submit → checkout endpoint →
 * Stripe redirect). Stripe's hosted checkout page is out of scope — its
 * DOM changes frequently and iframe isolation makes stable automation
 * expensive. The Stripe-side proof is covered by the webhook handlers
 * which are exercised by synthetic `stripe trigger` events.
 */
test('pro-monthly checkout redirects to Stripe', async ({ page }) => {
	await page.goto('/pricing');

	// Click the Start-checkout button on the Pro Monthly card.
	const monthlyCard = page.locator('article.card', {
		hasText: 'ForgeSchool Pro — Monthly'
	});
	await expect(monthlyCard).toBeVisible();
	const submit = monthlyCard.locator('button[type="submit"]');
	await expect(submit).toHaveText(/Start checkout/);

	// Follow the POST redirect but don't wait for Stripe's page to load.
	const [response] = await Promise.all([
		page.waitForResponse((r) => r.url().includes('/checkout/forgeschool-pro-monthly')),
		submit.click()
	]);

	// The POST returns a 303 from our endpoint. Stripe then returns a 2xx
	// but the redirect chain's final URL is a Stripe-owned host.
	expect(response.status()).toBeGreaterThanOrEqual(200);

	await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15_000 });
	expect(page.url()).toContain('checkout.stripe.com');
});
