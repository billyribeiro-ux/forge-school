---
number: 79
slug: meta-course-schema
title: Seed the meta-course product data + schema
module: 5
moduleSlug: product
moduleTitle: Product
phase: 5
step: 17
previous: 78
next: null
estimatedMinutes: 15
filesTouched:
  - drizzle/migrations/0002_meta_course_tables.sql
  - src/lib/server/db/schema.ts
  - scripts/seed-course.ts
  - scripts/seed-dev.ts
---

## Context

Lessons 079–082 ship the platform's first "meta-product" — a real course, DB-backed, sold inside ForgeSchool as the `forgeschool-lifetime` product. The `/curriculum/*.md` files you have been authoring all along are instructor-facing (the book you are reading right now); the rows we create in this lesson are customer-facing (the course Billy's students pay for). Two different surfaces, two different shapes: Markdown on disk for us, Postgres rows for them.

This lesson adds two tables — `course_modules` and `course_lessons` — linked by foreign keys to the existing `products` table. A matching `seed-course` step drops two placeholder modules with three short lessons each under the lifetime product so every later lesson in this arc has something real to render.

## The command

Add a migration file `drizzle/migrations/0002_meta_course_tables.sql` with both tables, their FKs, and uniqueness constraints. Bump the journal if you generate via drizzle-kit.

`src/lib/server/db/schema.ts` — append (before the webhook events section):

```ts
export const courseModules = pgTable(
  'course_modules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    orderIndex: integer('order_index').notNull(),
    createdAt: createdAt()
  },
  (t) => [
    uniqueIndex('course_modules_product_slug_uq').on(t.productId, t.slug),
    index('course_modules_product_order_idx').on(t.productId, t.orderIndex)
  ]
);

export const courseLessons = pgTable(
  'course_lessons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    moduleId: uuid('module_id').notNull().references(() => courseModules.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    orderIndex: integer('order_index').notNull(),
    createdAt: createdAt()
  },
  (t) => [
    uniqueIndex('course_lessons_module_slug_uq').on(t.moduleId, t.slug),
    index('course_lessons_module_order_idx').on(t.moduleId, t.orderIndex)
  ]
);
```

Export the inferred row types (`CourseModule`, `NewCourseModule`, `CourseLesson`, `NewCourseLesson`) alongside the others at the bottom of the file.

`scripts/seed-course.ts` exports a `seedCourse(db)` function that upserts two modules (`getting-started`, `your-first-lesson`) with three placeholder lessons each under the `forgeschool-lifetime` product. The upsert targets `(productId, slug)` for modules and `(moduleId, slug)` for lessons so reruns never duplicate.

Wire `seedCourse(db)` into `scripts/seed-dev.ts` between `seedCoupons` and `seedPersonas`.

```bash
pnpm db:reset
pnpm db:seed
pnpm check
```

## Why we chose this — the PE7 judgment

**Alternative 1: Reuse the instructor-facing `/curriculum/*.md` files as the customer-facing course.**
Those files document the *build* process — they name commits, discuss tradeoffs, and assume the reader is writing the same code. The customer-facing course is a separate deliverable with its own voice, pacing, and gating. Mixing the two surfaces means every lesson either leaks build trivia to end-users or waters down the instructor content. Two audiences, two tables.

**Alternative 2: Store the course as a JSON blob in `products.description` or a single `course_content` column.**
Breaks indexing, breaks per-lesson URLs, breaks progress tracking, breaks search. The relational shape costs five lines of Drizzle and pays back in every subsequent feature.

**Alternative 3: Point to an external CMS (Contentful, Sanity, Notion).**
Extra vendor, extra auth, extra latency, extra failure mode. We already have Postgres and a migration pipeline. Use them.

**Alternative 4: Hard-code the course content in the Svelte route.**
Works for one course. Dies the moment Billy wants a second course, admin edits, or content versioning.

The PE7 choice — a pair of relational tables with FK to `products.id` — wins because it composes with the existing catalog, entitlements, and seed infrastructure. No new vendors, no new concepts.

## What could go wrong

**Symptom:** Migration fails with `relation "products" does not exist`
**Cause:** The `0002` migration ran against an empty database with no prior migrations applied.
**Fix:** Run `pnpm db:reset` first; migrations run in journal order from 0000.

**Symptom:** `pnpm check` fails — `Type '{ ...; orderIndex: number }' is not assignable` on the seed insert
**Cause:** `NewCourseModule` requires `orderIndex`; easy to forget on a fresh insert.
**Fix:** Both tables make `orderIndex` non-null on purpose; always compute from the array index.

**Symptom:** Second seed run inserts duplicate lessons
**Cause:** The `onConflictDoUpdate` target did not include both `(moduleId, slug)`.
**Fix:** The unique index `course_lessons_module_slug_uq` is what the upsert targets — include BOTH columns.

## Verify

```bash
pnpm db:reset && pnpm db:seed
psql "$DATABASE_URL" -c "select count(*) from course_modules;"    # expect 2
psql "$DATABASE_URL" -c "select count(*) from course_lessons;"    # expect 6
pnpm check
```

## Mistake log

- **Forgot to add `seedCourse` to the `main()` pipeline in `seed-dev.ts`.** Ran a clean reset, no rows appeared, spent five minutes blaming the upsert before noticing the missing call.
- **First migration named the FK `course_modules_products_id_fk` without the source column.** drizzle-kit convention is `<table>_<col>_<fk_table>_<fk_col>_fk`; regenerated the SQL to match.
- **Upsert `set` block forgot `orderIndex`.** Reordering modules in the seed file left the DB stuck on the original index. Added `orderIndex` to every `.onConflictDoUpdate().set`.

## Commit

```bash
git add drizzle/migrations/0002_meta_course_tables.sql src/lib/server/db/schema.ts scripts/seed-course.ts scripts/seed-dev.ts
git add curriculum/module-05-product/lesson-079-meta-course-schema.md
git commit -m "feat(schema): meta-course modules + lessons + lesson 079"
```

Content is in place. Lesson 080 puts an entitlement gate in front of it.
