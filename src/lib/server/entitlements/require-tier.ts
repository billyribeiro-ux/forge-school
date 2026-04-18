/**
 * Route-gate helper: throw a redirect when the caller's tier is below
 * the required minimum.
 *
 * Pattern:
 *
 *     export const load = async ({ locals }) => {
 *       requireTier(locals.tier, 'pro', { upgradeTo: '/pricing?from=course' });
 *       …
 *     };
 *
 * `redirect` to `/pricing` (with an optional source query param for
 * lesson 112's analytics) keeps the gate cheap and reusable. For
 * pages that want to RENDER an upgrade prompt instead of redirecting,
 * call `tierAtLeast(locals.tier, 'pro')` directly and branch on it.
 */
import { redirect } from '@sveltejs/kit';
import { tierAtLeast, type Tier } from '$lib/entitlements/tier';

export function requireTier(
	actual: Tier,
	required: Tier,
	options: { upgradeTo?: string } = {}
): void {
	if (tierAtLeast(actual, required)) return;
	redirect(303, options.upgradeTo ?? '/pricing');
}
