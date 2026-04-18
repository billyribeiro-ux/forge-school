import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Accessibility scan — every public page passes axe-core's WCAG 2.2 AA
 * ruleset with zero violations.
 *
 * The scan covers landing, pricing, products catalog, the four legal
 * pages, support, contact, and the cart. Lesson + course pages are
 * tier-gated and tested separately.
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
	'/cart'
] as const;

for (const path of PUBLIC_PATHS) {
	test(`a11y ${path}`, async ({ page }) => {
		await page.goto(path);
		const results = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
			.analyze();
		expect(
			results.violations,
			`${path}: ${results.violations.map((v) => v.id).join(', ')}`
		).toEqual([]);
	});
}
