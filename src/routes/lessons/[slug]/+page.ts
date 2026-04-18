import { error } from '@sveltejs/kit';
import { getLesson, listLessons } from '$lib/curriculum';

export const load = ({ params }) => {
	const lesson = getLesson(params.slug);
	if (lesson === null) {
		error(404, {
			message: `Lesson "${params.slug}" not found`,
			errorId: `lesson-not-found-${params.slug}`
		});
	}
	return {
		Component: lesson.Component,
		meta: lesson.meta
	};
};

// Prerender every lesson route at build time.
export const prerender = true;

// Tell SvelteKit the complete set of slugs to prerender. Without this,
// SvelteKit discovers slugs by crawling prerendered links — which works
// because /lessons links to every lesson — but listing entries explicitly
// is more robust against future listing changes.
export const entries = () => listLessons().map((l) => ({ slug: l.slug }));
