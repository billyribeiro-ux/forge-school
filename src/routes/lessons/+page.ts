import { listModules } from '$lib/curriculum';

export const load = () => {
	const modules = listModules();
	const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
	const totalMinutes = modules.reduce(
		(sum, m) => sum + m.lessons.reduce((s, l) => s + l.estimatedMinutes, 0),
		0
	);
	return { modules, totalLessons, totalMinutes };
};

// The curriculum is a build-time constant; prerender the listing statically.
export const prerender = true;
