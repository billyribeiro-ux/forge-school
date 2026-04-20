/**
 * /course/[moduleSlug]/[lessonSlug] — lesson view + progression.
 *
 * Entitlement-gated. Reads the `forgeschool_progress` cookie (JSON map
 * of lesson id → { completedAt }) and passes it into the page so the
 * UI can mark completed lessons. The `?/complete` form action writes
 * a new entry and redirects to the next lesson in the module.
 *
 * We intentionally treat the progress cookie as opaque-to-the-wire:
 * the server is the single reader/writer of its shape. This keeps the
 * format changeable without breaking shipped clients.
 */

import type { Cookies } from '@sveltejs/kit';
import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { getCourseLesson, getNextCourseLessonInModule } from '$lib/server/db/queries';
import { hasEntitlement } from '$lib/server/entitlements';
import { ensureSessionCookie } from '$lib/server/session';
import type { Actions, PageServerLoad } from './$types';

const COURSE_PRODUCT_SLUG = 'forgeschool-lifetime';
const PROGRESS_COOKIE = 'forgeschool_progress';
const PROGRESS_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

type LessonProgress = { completedAt: string };
type ProgressMap = Record<string, LessonProgress>;

function readProgress(cookies: Cookies): ProgressMap {
	const raw = cookies.get(PROGRESS_COOKIE);
	if (raw === undefined || raw === '') return {};
	try {
		const parsed: unknown = JSON.parse(raw);
		if (parsed === null || typeof parsed !== 'object') return {};
		const out: ProgressMap = {};
		for (const [k, v] of Object.entries(parsed)) {
			if (
				v !== null &&
				typeof v === 'object' &&
				'completedAt' in v &&
				typeof (v as { completedAt: unknown }).completedAt === 'string'
			) {
				out[k] = { completedAt: (v as { completedAt: string }).completedAt };
			}
		}
		return out;
	} catch {
		return {};
	}
}

function writeProgress(cookies: Cookies, progress: ProgressMap): void {
	cookies.set(PROGRESS_COOKIE, JSON.stringify(progress), {
		path: '/',
		httpOnly: false,
		secure: true,
		sameSite: 'lax',
		maxAge: PROGRESS_MAX_AGE_SECONDS
	});
}

export const load: PageServerLoad = async ({ cookies, params }) => {
	const sessionId = ensureSessionCookie(cookies);

	const entitled = await hasEntitlement(db, {
		sessionId,
		productSlug: COURSE_PRODUCT_SLUG
	});

	if (!entitled) {
		redirect(303, '/course');
	}

	const row = await getCourseLesson(db, {
		productSlug: COURSE_PRODUCT_SLUG,
		moduleSlug: params.moduleSlug,
		lessonSlug: params.lessonSlug
	});

	if (row === null) {
		error(404, {
			message: `Lesson "${params.lessonSlug}" not found`,
			errorId: `course-lesson-not-found-${params.moduleSlug}-${params.lessonSlug}`
		});
	}

	const progress = readProgress(cookies);
	const completed = progress[row.lesson.id] !== undefined;

	return { module: row.module, lesson: row.lesson, completed };
};

export const actions: Actions = {
	complete: async ({ cookies, params }) => {
		const sessionId = ensureSessionCookie(cookies);

		const entitled = await hasEntitlement(db, {
			sessionId,
			productSlug: COURSE_PRODUCT_SLUG
		});

		if (!entitled) {
			return fail(403, { message: 'Not entitled' });
		}

		const row = await getCourseLesson(db, {
			productSlug: COURSE_PRODUCT_SLUG,
			moduleSlug: params.moduleSlug,
			lessonSlug: params.lessonSlug
		});

		if (row === null) {
			return fail(404, { message: 'Lesson not found' });
		}

		const progress = readProgress(cookies);
		progress[row.lesson.id] = { completedAt: new Date().toISOString() };
		writeProgress(cookies, progress);

		const next = await getNextCourseLessonInModule(db, {
			moduleId: row.module.id,
			currentOrderIndex: row.lesson.orderIndex
		});

		if (next === null) {
			redirect(303, `/course/${row.module.slug}`);
		}

		redirect(303, `/course/${row.module.slug}/${next.slug}`);
	}
};
