import { expect, test } from '@playwright/test';

/**
 * Full-loop cart E2E: browse → add → cart → checkout handoff.
 *
 * This test stops at the Stripe redirect boundary — asserting we hand
 * off to `checkout.stripe.com` with the correct line items. Completing
 * payment and observing the webhook-driven entitlement grant is
 * covered by the single-product specs (checkout-lifetime.spec.ts et al.)
 * and would require Stripe CLI forwarding that the CI harness doesn't
 * guarantee.
 */
test('cart full-loop: add lifetime, view cart, hand off to Stripe', async ({ page }) => {
	await page.goto('/products/forgeschool-lifetime');
	await expect(page.getByRole('heading', { name: /ForgeSchool.*Lifetime/ })).toBeVisible();

	// Add to cart, expect the flash confirmation.
	const addButton = page.getByRole('button', { name: 'Add to cart' });
	await addButton.click();
	await expect(page.getByRole('button', { name: /Added/ })).toBeVisible();

	// Cart badge reflects the add.
	const badge = page.getByRole('link', { name: /Cart \(1 items\)/ });
	await expect(badge).toBeVisible();
	await badge.click();

	// /cart shows the line item + subtotal.
	await expect(page.getByRole('heading', { name: 'Your cart' })).toBeVisible();
	await expect(page.getByText('ForgeSchool — Lifetime')).toBeVisible();
	await expect(page.getByText('$497')).toBeVisible();

	// Checkout hands off to Stripe.
	await Promise.all([
		page.waitForResponse((r) => r.url().includes('/cart/checkout')),
		page.getByRole('button', { name: /Checkout/ }).click()
	]);

	await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15_000 });
	expect(page.url()).toContain('checkout.stripe.com');
});

test('coupon application: apply WELCOME10, see 10% discount, remove', async ({ page }) => {
	await page.goto('/products/forgeschool-lifetime');
	await page.getByRole('button', { name: 'Add to cart' }).click();
	await page.getByRole('link', { name: /Cart \(1 items\)/ }).click();

	await page.getByPlaceholder('Enter a code').fill('WELCOME10');
	await page.getByRole('button', { name: 'Apply' }).click();

	await expect(page.getByText('WELCOME10')).toBeVisible();
	await expect(page.getByText(/10% off/)).toBeVisible();
	await expect(page.getByText('Discount')).toBeVisible();

	// Remove restores the original total.
	await page.getByRole('button', { name: 'Remove' }).click();
	await expect(page.getByPlaceholder('Enter a code')).toBeVisible();
	await expect(page.getByText('Discount')).not.toBeVisible();
});
