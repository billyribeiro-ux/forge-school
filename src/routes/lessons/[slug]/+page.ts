import { error } from '@sveltejs/kit';
import { getLesson, getLessonByNumber, listLessons } from '$lib/curriculum';

export const load = ({ params }) => {
	const lesson = getLesson(params.slug);
	if (lesson === null) {
		error(404, {
			message: `Lesson "${params.slug}" not found`,
			errorId: `lesson-not-found-${params.slug}`
		});
	}
	const prev = lesson.meta.previous !== null ? getLessonByNumber(lesson.meta.previous) : null;
	const next = lesson.meta.next !== null ? getLessonByNumber(lesson.meta.next) : null;
	return {
		Component: lesson.Component,
		meta: lesson.meta,
		prev: prev === null ? null : { slug: prev.meta.slug, title: prev.meta.title, number: prev.meta.number },
		next: next === null ? null : { slug: next.meta.slug, title: next.meta.title, number: next.meta.number }
	};
};

// Prerender every lesson route at build time.
export const prerender = true;

// Tell SvelteKit the complete set of slugs to prerender. Without this,
// SvelteKit discovers slugs by crawling prerendered links — which works
// because /lessons links to every lesson — but listing entries explicitly
// is more robust against future listing changes.
export const entries = () => listLessons().map((l) => ({ slug: l.slug }));
