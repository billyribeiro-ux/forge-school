/**
 * Seed the meta-course modules + lessons under the `forgeschool-lifetime`
 * product. Idempotent: rerun upserts on (productId, slug) for modules
 * and (moduleId, slug) for lessons, so content edits land on the next
 * run without duplicates.
 *
 * Invoke as part of the full dev seed (wired from scripts/seed-dev.ts),
 * or standalone via `pnpm tsx scripts/seed-course.ts`.
 */

import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../src/lib/server/db/schema.ts';

const COURSE_PRODUCT_SLUG = 'forgeschool-lifetime';

type LessonSeed = {
	slug: string;
	title: string;
	body: string;
};

type ModuleSeed = {
	slug: string;
	title: string;
	lessons: LessonSeed[];
};

const modules: ModuleSeed[] = [
	{
		slug: 'getting-started',
		title: 'Getting started',
		lessons: [
			{
				slug: 'welcome',
				title: 'Welcome to ForgeSchool',
				body: 'This is the meta-course. Everything you learn here was built in the ForgeSchool codebase itself.\n\nPlaceholder body — real content ships in a later lesson.'
			},
			{
				slug: 'how-this-course-works',
				title: 'How this course works',
				body: 'Every lesson is atomic and ships with a real commit in the ForgeSchool repo.\n\nPlaceholder body.'
			},
			{
				slug: 'set-up-your-environment',
				title: 'Set up your environment',
				body: 'Install pnpm, clone the repo, and run `pnpm install`.\n\nPlaceholder body.'
			}
		]
	},
	{
		slug: 'your-first-lesson',
		title: 'Your first lesson',
		lessons: [
			{
				slug: 'read-a-lesson',
				title: 'Read a lesson',
				body: 'Lessons are Markdown files. Read them in order.\n\nPlaceholder body.'
			},
			{
				slug: 'follow-along',
				title: 'Follow along in your own repo',
				body: 'Type every command by hand. The muscle memory is the point.\n\nPlaceholder body.'
			},
			{
				slug: 'commit-your-work',
				title: 'Commit your work',
				body: 'One lesson, one commit. Always.\n\nPlaceholder body.'
			}
		]
	}
];

export async function seedCourse(db: PostgresJsDatabase<typeof schema>): Promise<void> {
	console.log('[seed] meta-course modules + lessons...');

	const [product] = await db
		.select()
		.from(schema.products)
		.where(eq(schema.products.slug, COURSE_PRODUCT_SLUG))
		.limit(1);

	if (product === undefined) {
		throw new Error(
			`[seed-course] product '${COURSE_PRODUCT_SLUG}' missing; run seedProducts first`
		);
	}

	for (const [mIdx, mod] of modules.entries()) {
		const [insertedModule] = await db
			.insert(schema.courseModules)
			.values({
				productId: product.id,
				slug: mod.slug,
				title: mod.title,
				orderIndex: mIdx
			})
			.onConflictDoUpdate({
				target: [schema.courseModules.productId, schema.courseModules.slug],
				set: { title: mod.title, orderIndex: mIdx }
			})
			.returning();

		if (insertedModule === undefined) {
			throw new Error(`[seed-course] failed to upsert module ${mod.slug}`);
		}

		for (const [lIdx, lesson] of mod.lessons.entries()) {
			await db
				.insert(schema.courseLessons)
				.values({
					moduleId: insertedModule.id,
					slug: lesson.slug,
					title: lesson.title,
					body: lesson.body,
					orderIndex: lIdx
				})
				.onConflictDoUpdate({
					target: [schema.courseLessons.moduleId, schema.courseLessons.slug],
					set: {
						title: lesson.title,
						body: lesson.body,
						orderIndex: lIdx
					}
				});
		}

		console.log(`[seed]   ✓ module '${mod.slug}' · ${mod.lessons.length} lesson(s)`);
	}
}
