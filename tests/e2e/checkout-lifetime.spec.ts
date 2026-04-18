import { expect, test } from '@playwright/test';

test('lifetime one-time checkout redirects to Stripe', async ({ page }) => {
	await page.goto('/pricing');
	const lifetimeCard = page.locator('article.card', { hasText: 'ForgeSchool — Lifetime' });
	await expect(lifetimeCard).toBeVisible();

	// Lifetime shows "$497" + "one-time" — not a trial.
	await expect(lifetimeCard.getByText(/one-time/)).toBeVisible();

	await Promise.all([
		page.waitForResponse((r) => r.url().includes('/checkout/forgeschool-lifetime')),
		lifetimeCard.locator('button[type="submit"]').click()
	]);

	await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15_000 });
	expect(page.url()).toContain('checkout.stripe.com');
});
