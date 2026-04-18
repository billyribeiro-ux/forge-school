/**
 * Smoke tests for src/lib/curriculum/index.ts.
 *
 * These exercise the build-time validation path — simply importing the
 * loader runs the schema + chain checks against every lesson on disk.
 * If a future lesson ships with bad frontmatter, this test suite fails
 * before `pnpm build` does.
 */
import { describe, expect, it } from 'vitest';
import {
	getLesson,
	getLessonByNumber,
	getModule,
	listLessons,
	listModules
} from '../src/lib/curriculum/index.ts';

describe('curriculum loader', () => {
	it('indexes the Foundation and Data modules', () => {
		const mods = listModules();
		const slugs = mods.map((m) => m.slug);
		expect(slugs).toContain('foundation');
		expect(slugs).toContain('data');
		expect(slugs).toContain('content-pipeline');
	});

	it('returns a module by slug with its lessons ordered by number', () => {
		const foundation = getModule('foundation');
		expect(foundation).not.toBeNull();
		expect(foundation?.number).toBe(1);
		expect(foundation?.title).toBe('Foundation');
		expect(foundation?.lessons.length).toBeGreaterThanOrEqual(16);
		const numbers = foundation?.lessons.map((l) => l.number) ?? [];
		const sorted = [...numbers].sort((a, b) => a - b);
		expect(numbers).toEqual(sorted);
	});

	it('looks up lessons by slug and by number', () => {
		const bySlug = getLesson('spec-the-product');
		expect(bySlug).not.toBeNull();
		expect(bySlug?.meta.number).toBe(1);
		expect(bySlug?.meta.title).toBe('Spec the product before writing a single line of code');

		const byNumber = getLessonByNumber(1);
		expect(byNumber).not.toBeNull();
		expect(byNumber?.meta.slug).toBe('spec-the-product');
		expect(byNumber?.Component).toBeDefined();
	});

	it('enforces prev/next chain integrity across the full corpus', () => {
		const lessons = listLessons();
		for (const lesson of lessons) {
			if (lesson.previous !== null) {
				const prev = getLessonByNumber(lesson.previous);
				expect(
					prev,
					`lesson ${lesson.number}: previous=${lesson.previous} should resolve`
				).not.toBeNull();
			}
			if (lesson.next !== null) {
				const next = getLessonByNumber(lesson.next);
				expect(next, `lesson ${lesson.number}: next=${lesson.next} should resolve`).not.toBeNull();
			}
		}
	});

	it('lesson 1 has no previous; the final lesson has no next', () => {
		const first = getLessonByNumber(1);
		expect(first?.meta.previous).toBeNull();

		const lessons = listLessons();
		const lastNumber = Math.max(...lessons.map((l) => l.number));
		const last = getLessonByNumber(lastNumber);
		expect(last?.meta.next).toBeNull();
	});
});
