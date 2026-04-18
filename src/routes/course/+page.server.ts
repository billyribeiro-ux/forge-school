/**
 * /course — entitlement-gated course index.
 *
 * Reads the anonymous session cookie, checks whether the session owns
 * the `forgeschool-lifetime` product, and either renders a lightweight
 * gate page or the module list. No route-level hook gate yet (the
 * shared entitlement-middleware lands in a later lesson); this route
 * checks in its own load for explicitness.
 */
import { db } from '$lib/server/db';
import { listCourseModulesByProductSlug } from '$lib/server/db/queries';
import { hasEntitlement } from '$lib/server/entitlements';
import { ensureSessionCookie } from '$lib/server/session';

const COURSE_PRODUCT_SLUG = 'forgeschool-lifetime';

export const load = async ({ cookies }) => {
	const sessionId = ensureSessionCookie(cookies);

	const entitled = await hasEntitlement(db, {
		sessionId,
		productSlug: COURSE_PRODUCT_SLUG
	});

	if (!entitled) {
		return { entitled: false as const, productSlug: COURSE_PRODUCT_SLUG };
	}

	const modules = await listCourseModulesByProductSlug(db, COURSE_PRODUCT_SLUG);

	return { entitled: true as const, modules };
};
