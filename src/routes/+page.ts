import { listLessons, listModules } from '$lib/curriculum';
import type { PageLoad } from './$types';

export const load: PageLoad = () => {
	const modules = listModules();
	const totalLessons = listLessons().length;
	const totalMinutes = modules.reduce(
		(sum, m) => sum + m.lessons.reduce((s, l) => s + l.estimatedMinutes, 0),
		0
	);
	return {
		modules,
		totalLessons,
		totalMinutes
	};
};

export const prerender = true;
