import { expect, test } from '@playwright/test';

test('pro-yearly checkout redirects to Stripe', async ({ page }) => {
	await page.goto('/pricing');
	const yearlyCard = page.locator('article.card', { hasText: 'ForgeSchool Pro — Yearly' });
	await expect(yearlyCard).toBeVisible();

	// Confirm the 14-day trial note renders for yearly (seed spec sets it).
	await expect(yearlyCard.getByText(/14-day free trial/)).toBeVisible();

	await Promise.all([
		page.waitForResponse((r) => r.url().includes('/checkout/forgeschool-pro-yearly')),
		yearlyCard.locator('button[type="submit"]').click()
	]);

	await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15_000 });
	expect(page.url()).toContain('checkout.stripe.com');
});
