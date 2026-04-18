/**
 * /course/[moduleSlug] — module view.
 *
 * Same entitlement gate as /course. 404s when the module slug is
 * unknown under the course product.
 */
import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { hasEntitlement } from '$lib/server/entitlements';
import { getCourseModuleWithLessons } from '$lib/server/db/queries';
import { ensureSessionCookie } from '$lib/server/session';

const COURSE_PRODUCT_SLUG = 'forgeschool-lifetime';

export const load = async ({ cookies, params }) => {
	const sessionId = ensureSessionCookie(cookies);

	const entitled = await hasEntitlement(db, {
		sessionId,
		productSlug: COURSE_PRODUCT_SLUG
	});

	if (!entitled) {
		redirect(303, '/course');
	}

	const mod = await getCourseModuleWithLessons(db, {
		productSlug: COURSE_PRODUCT_SLUG,
		moduleSlug: params.moduleSlug
	});

	if (mod === null) {
		error(404, {
			message: `Module "${params.moduleSlug}" not found`,
			errorId: `course-module-not-found-${params.moduleSlug}`
		});
	}

	return { module: mod };
};
