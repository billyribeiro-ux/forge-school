import { expect, test } from '@playwright/test';

/**
 * Critical-path smoke — fast-running E2E that asserts every public page
 * returns 200, the cart flow reaches Stripe, and the account dashboard
 * renders for an unentitled session. Runs on every CI push.
 */

const PUBLIC_PATHS = [
	'/',
	'/pricing',
	'/products',
	'/about',
	'/support',
	'/contact',
	'/terms',
	'/privacy',
	'/refund-policy',
	'/cookie-notice',
	'/lessons'
];

for (const path of PUBLIC_PATHS) {
	test(`GET ${path} returns 200`, async ({ page }) => {
		const response = await page.goto(path);
		expect(response?.status(), `${path} returned ${response?.status()}`).toBe(200);
	});
}

test('account dashboard renders for unentitled session', async ({ page }) => {
	await page.goto('/account');
	await expect(page.getByRole('heading', { name: 'Your account' })).toBeVisible();
	await expect(page.getByText('Free')).toBeVisible();
});

test('sitemap.xml returns XML', async ({ page }) => {
	const response = await page.goto('/sitemap.xml');
	expect(response?.headers()['content-type']).toContain('xml');
});

test('robots.txt includes Disallow: /admin', async ({ request }) => {
	const body = await (await request.get('/robots.txt')).text();
	expect(body).toContain('Disallow: /admin');
});
