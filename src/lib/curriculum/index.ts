/**
 * ForgeSchool curriculum loader.
 *
 * Reads every lesson Markdown file under `curriculum/` via Vite's
 * `import.meta.glob` (eager), parses the frontmatter each lesson
 * exports through mdsvex, and exposes a typed table-of-contents + a
 * small set of query functions routes can call.
 *
 * The loader runs at BUILD time; validation errors fail `pnpm build`.
 * This is intentional — a malformed lesson must never ship.
 *
 * Exposed surface matches docs/CURRICULUM.md §5.
 */
import type { Component } from 'svelte';

export type LessonMeta = {
	number: number;
	slug: string;
	title: string;
	module: number;
	moduleSlug: string;
	moduleTitle: string;
	phase: number;
	step: number;
	previous: number | null;
	next: number | null;
	estimatedMinutes: number;
	filesTouched: string[];
	draft?: boolean;
	commit?: string;
};

export type LessonModule = {
	Component: Component;
	meta: LessonMeta;
	sourcePath: string;
};

export type ModuleIndex = {
	number: number;
	slug: string;
	title: string;
	lessons: LessonMeta[];
};

type RawModule = {
	default: Component;
	metadata?: Record<string, unknown>;
};

const REQUIRED_KEYS: readonly (keyof LessonMeta)[] = [
	'number',
	'slug',
	'title',
	'module',
	'moduleSlug',
	'moduleTitle',
	'phase',
	'step',
	'previous',
	'next',
	'estimatedMinutes',
	'filesTouched'
];

function assertLessonMeta(
	path: string,
	meta: Record<string, unknown> | undefined
): asserts meta is LessonMeta {
	if (meta === undefined) {
		throw new Error(`[curriculum] ${path}: missing frontmatter`);
	}
	for (const key of REQUIRED_KEYS) {
		if (!(key in meta)) {
			throw new Error(`[curriculum] ${path}: missing required key "${key}"`);
		}
	}
	if (!Array.isArray(meta['filesTouched'])) {
		throw new Error(`[curriculum] ${path}: filesTouched must be an array`);
	}
}

const rawModules = import.meta.glob<RawModule>('/curriculum/**/lesson-*.md', { eager: true });

const lessons: LessonModule[] = [];
const lessonsBySlug = new Map<string, LessonModule>();
const lessonsByNumber = new Map<number, LessonModule>();

for (const [sourcePath, raw] of Object.entries(rawModules)) {
	assertLessonMeta(sourcePath, raw.metadata);

	const meta = raw.metadata;
	const lesson: LessonModule = {
		Component: raw.default,
		meta,
		sourcePath
	};

	if (meta.draft === true) {
		continue;
	}

	if (lessonsBySlug.has(meta.slug)) {
		const conflict = lessonsBySlug.get(meta.slug);
		throw new Error(
			`[curriculum] duplicate slug "${meta.slug}" in ${sourcePath} and ${conflict?.sourcePath ?? '???'}`
		);
	}
	if (lessonsByNumber.has(meta.number)) {
		const conflict = lessonsByNumber.get(meta.number);
		throw new Error(
			`[curriculum] duplicate number ${meta.number} in ${sourcePath} and ${conflict?.sourcePath ?? '???'}`
		);
	}

	lessons.push(lesson);
	lessonsBySlug.set(meta.slug, lesson);
	lessonsByNumber.set(meta.number, lesson);
}

lessons.sort((a, b) => a.meta.number - b.meta.number);

// Validate prev/next chains resolve
for (const lesson of lessons) {
	const { meta, sourcePath } = lesson;
	if (meta.previous !== null && !lessonsByNumber.has(meta.previous)) {
		throw new Error(
			`[curriculum] ${sourcePath}: previous=${meta.previous} does not match any lesson number`
		);
	}
	if (meta.next !== null && !lessonsByNumber.has(meta.next)) {
		throw new Error(
			`[curriculum] ${sourcePath}: next=${meta.next} does not match any lesson number`
		);
	}
}

// Group lessons into modules in monotonic order
const moduleMap = new Map<number, ModuleIndex>();
for (const lesson of lessons) {
	const { module: moduleNumber, moduleSlug, moduleTitle } = lesson.meta;
	let index = moduleMap.get(moduleNumber);
	if (index === undefined) {
		index = {
			number: moduleNumber,
			slug: moduleSlug,
			title: moduleTitle,
			lessons: []
		};
		moduleMap.set(moduleNumber, index);
	}
	index.lessons.push(lesson.meta);
}

const modules: ModuleIndex[] = [...moduleMap.values()].sort((a, b) => a.number - b.number);

/* ─── Public query surface ────────────────────────────────────────────── */

/** Every module, ordered by module number. */
export function listModules(): ModuleIndex[] {
	return modules;
}

/** Look up a module by its slug (e.g., "foundation", "data"). */
export function getModule(moduleSlug: string): ModuleIndex | null {
	return modules.find((m) => m.slug === moduleSlug) ?? null;
}

/** Every lesson's metadata, ordered by lesson number. Useful for listing UIs. */
export function listLessons(): LessonMeta[] {
	return lessons.map((l) => l.meta);
}

/** Look up a lesson (metadata + component) by slug. */
export function getLesson(slug: string): LessonModule | null {
	return lessonsBySlug.get(slug) ?? null;
}

/** Look up a lesson by its number. Handy for prev/next resolution. */
export function getLessonByNumber(number: number): LessonModule | null {
	return lessonsByNumber.get(number) ?? null;
}
