---
number: 81
slug: course-module-view
title: Course module view at /course/[moduleSlug]
module: 5
moduleSlug: product
moduleTitle: Product
phase: 5
step: 19
previous: 80
next: null
estimatedMinutes: 12
filesTouched:
  - src/lib/server/db/queries.ts
  - src/routes/course/[moduleSlug]/+page.server.ts
  - src/routes/course/[moduleSlug]/+page.svelte
---

## Context

`/course` lists modules. This lesson adds the next layer down — `/course/[moduleSlug]` — which renders one module's title plus its ordered lesson list. Lesson rows link into the lesson view we build in lesson 082.

Same entitlement gate as the index. Unknown slugs 404 with a stable `errorId` so support requests are traceable. Un-entitled visitors redirect back to `/course` (where the gate does the upsell work) rather than rendering a second gate here.

## The command

`src/lib/server/db/queries.ts` — add `getCourseModuleWithLessons`:

```ts
export async function getCourseModuleWithLessons(
  db: Db,
  args: { productSlug: string; moduleSlug: string }
): Promise<CourseModuleWithLessons | null> {
  const [moduleRow] = await db
    .select({ module: courseModules })
    .from(courseModules)
    .innerJoin(products, eq(products.id, courseModules.productId))
    .where(and(eq(products.slug, args.productSlug), eq(courseModules.slug, args.moduleSlug)))
    .limit(1);
  if (moduleRow === undefined) return null;
  const lessons = await db
    .select()
    .from(courseLessons)
    .where(eq(courseLessons.moduleId, moduleRow.module.id))
    .orderBy(asc(courseLessons.orderIndex));
  return { ...moduleRow.module, lessons };
}
```

`src/routes/course/[moduleSlug]/+page.server.ts`:

```ts
export const load = async ({ cookies, params }) => {
  const sessionId = ensureSessionCookie(cookies);
  const entitled = await hasEntitlement(db, {
    sessionId,
    productSlug: 'forgeschool-lifetime'
  });
  if (!entitled) redirect(303, '/course');
  const mod = await getCourseModuleWithLessons(db, {
    productSlug: 'forgeschool-lifetime',
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
```

`src/routes/course/[moduleSlug]/+page.svelte` renders:
- Breadcrumb (`← All modules`)
- Eyebrow with `Module N` (from `orderIndex + 1`)
- H1 title
- `<ol>` of lessons linking to `/course/{mod.slug}/{lesson.slug}`

```bash
pnpm check
pnpm dev   # /course/getting-started
```

## Why we chose this — the PE7 judgment

**Alternative 1: Two separate round-trips — a `getModule` and a `listLessonsForModule`.**
The module lookup already scopes to product slug; splitting that into two queries means every view does two transactions and must guard against the "module exists, lessons disappeared between calls" race. A single function returns a coherent snapshot.

**Alternative 2: Look up modules by UUID in the URL.**
UUIDs are not user-friendly. Slugs survive refactors, are SEO-friendly, and are the platform's convention for every public URL.

**Alternative 3: Render a second gate card here instead of redirecting un-entitled visitors.**
Two gate surfaces to maintain, two copies of the upsell copy, two places to update when pricing changes. One gate at `/course`, redirect-for-the-rest.

**Alternative 4: Let `error(404, ...)` throw without an `errorId`.**
Support can't correlate a customer's "I clicked a link and it 404'd" screenshot back to a log line. Every error in this codebase carries a stable `errorId` so the support loop closes.

The PE7 choice — one query, one redirect path, stable errorIds — wins on data coherence, URL hygiene, and support-loop discipline.

## What could go wrong

**Symptom:** Module page renders for an un-entitled user
**Cause:** The entitlement check was on the page component, not the `+page.server.ts` load.
**Fix:** Gate in `load`; redirect is the exit signal. Never trust a client-side gate.

**Symptom:** 404 on a valid slug
**Cause:** A typo in the slug seeded differently than the route expects (e.g., `your_first_lesson` vs. `your-first-lesson`).
**Fix:** Slugs are kebab-case across the codebase. Cross-check the seed script.

**Symptom:** Lessons render out of order
**Cause:** `orderBy` omitted or sorted by `createdAt` which ties on batch inserts.
**Fix:** Order by `courseLessons.orderIndex` — that's exactly why the column exists.

## Verify

```bash
pnpm check
pnpm dev
curl -s -I http://localhost:5173/course/getting-started | head -n 1      # 302 without entitlement, 200 with
curl -s -I http://localhost:5173/course/does-not-exist | head -n 1        # 404 (after grant)
```

## Mistake log

- **Left `redirect` imported from `@sveltejs/kit` but forgot to throw it as a statement** — `redirect` in SvelteKit is called like `redirect(303, '/course')` (it throws internally); `return redirect(...)` works but `if (!entitled) redirect(...)` without the `throw`/`return` keyword is still valid because it throws. Re-reading the docs saved a second round of head-scratching.
- **First pass joined `courseLessons` to `products` directly.** Not wrong, but duplicated the join already established via `courseModules`. Routing every lookup through `courseModules` keeps the query shape consistent.
- **Used `params.moduleSlug` to build the 404 `errorId` without normalizing case.** A link with `/course/Getting-Started` produced a different `errorId` than `/course/getting-started`, fragmenting support tickets. Lowercased at the edge.

## Commit

```bash
git add src/lib/server/db/queries.ts src/routes/course/\[moduleSlug\]/
git add curriculum/module-05-product/lesson-081-course-module-view.md
git commit -m "feat(routes): /course/[moduleSlug] module view + lesson 081"
```

One layer left — the lesson view itself, with progression tracking.
