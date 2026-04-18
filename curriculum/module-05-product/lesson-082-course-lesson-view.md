---
number: 82
slug: course-lesson-view
title: Course lesson view + progression cookie
module: 5
moduleSlug: product
moduleTitle: Product
phase: 5
step: 20
previous: 81
next: null
estimatedMinutes: 18
filesTouched:
  - src/lib/server/db/queries.ts
  - src/routes/course/[moduleSlug]/[lessonSlug]/+page.server.ts
  - src/routes/course/[moduleSlug]/[lessonSlug]/+page.svelte
---

## Context

The lesson view is the deepest URL in the course hierarchy — `/course/[moduleSlug]/[lessonSlug]` — and the one that does the most work. Same entitlement gate. It loads the lesson body, renders it, and wires a `<form method="POST" action="?/complete">` that writes a progression entry to the `forgeschool_progress` cookie and redirects to the next lesson in the same module.

Progression in v1 is anonymous — we key off `forge_session`, there is no auth yet — so storing the state in a cookie owned by the server keeps the data next to the principal. A DB-backed `lesson_progress` table arrives alongside auth in a later module; this cookie-based layer is deliberate, not temporary.

Markdown rendering: the `marked` library is not in the stack and `mdsvex` is wired only for build-time Markdown. For v1 we preserve newlines via `white-space: pre-wrap` on a plain text node. A dedicated Markdown-to-HTML pipeline for customer lessons ships in a later lesson.

## The command

`src/lib/server/db/queries.ts` — add `getCourseLesson(db, { productSlug, moduleSlug, lessonSlug })` and `getNextCourseLessonInModule(db, { moduleId, currentOrderIndex })` (using `gt` on `orderIndex`, `limit 1`, ordered by `orderIndex asc`).

`src/routes/course/[moduleSlug]/[lessonSlug]/+page.server.ts`:

```ts
const PROGRESS_COOKIE = 'forgeschool_progress';
type LessonProgress = { completedAt: string };
type ProgressMap = Record<string, LessonProgress>;

function readProgress(cookies: Cookies): ProgressMap { /* JSON.parse with narrow type-guards */ }
function writeProgress(cookies: Cookies, progress: ProgressMap): void { /* JSON.stringify */ }

export const load = async ({ cookies, params }) => {
  // 1. ensureSessionCookie
  // 2. hasEntitlement → redirect(303, '/course') if not
  // 3. getCourseLesson → error(404, …) if null
  // 4. readProgress → completed = progress[lesson.id] !== undefined
  return { module, lesson, completed };
};

export const actions = {
  complete: async ({ cookies, params }) => {
    // same gate
    // write progress[lesson.id] = { completedAt: new Date().toISOString() }
    // resolve next lesson; redirect to next or back to module index
  }
};
```

`+page.svelte` renders breadcrumbs, an eyebrow (`Lesson N of this module`), the title, a `Completed` badge when `data.completed`, and a `<p class="prose">{lesson.body}</p>` with `white-space: pre-wrap`. Submit button: "Mark complete & continue".

```bash
pnpm check
pnpm dev
# From the module page, click the first lesson; click Mark complete — lands on lesson 2.
```

## Why we chose this — the PE7 judgment

**Alternative 1: Track progress in `localStorage`.**
Client-owned storage means the server cannot render "already completed" badges on SSR — the first paint is always wrong, then the client hydrates and flicks the badge on. The cookie is server-readable and produces consistent SSR.

**Alternative 2: Add a `lesson_progress` DB table now.**
Tempting, but the table must key off a principal — and auth is not here yet. Building the table against `session_id` creates a schema that has to be reshaped the moment users appear. The cookie captures progress at the same granularity and migrates cleanly once the `sessions ↔ users` link table lands.

**Alternative 3: Render Markdown through a homegrown regex.**
Regex-based Markdown is a CVE factory. Ship the plain-text fallback and land a real parser (remark or marked, sanitized) in a dedicated lesson with its own test surface.

**Alternative 4: Use a `<button type="button">` + `fetch` instead of a form action.**
Breaks progressive enhancement. SvelteKit form actions work without JS; the user gets the redirect even on a cold tab. That's the right default.

The PE7 choice — server-authoritative cookie, SvelteKit form action, plain-text Markdown placeholder — wins on SSR consistency, no-JS fallback, and postponing the auth-coupled DB work until it can be done right.

## What could go wrong

**Symptom:** `pnpm check` fails on the `readProgress` parse path
**Cause:** `JSON.parse` returns `any`; assigning it straight to `ProgressMap` violates the zero-`any` rule.
**Fix:** Type the parse result as `unknown`, narrow with runtime checks before shaping it into `ProgressMap`.

**Symptom:** "Mark complete" submits but does not redirect
**Cause:** SvelteKit's `redirect` must be thrown from an action (`throw redirect(303, ...)` or simply `redirect(303, ...)` which throws internally). Returning a plain object resolves the action but never navigates.
**Fix:** Call `redirect(303, next)` — no `return`, no `await`.

**Symptom:** The progress cookie appears in `document.cookie` and users can see their own progress
**Cause:** This is expected. We set `httpOnly: false` deliberately so a future client-side progress indicator can read it without a network round-trip. The cookie holds no security-sensitive data — only lesson ids a user who owns the course already knows.

**Symptom:** Completing the last lesson in a module 404s
**Cause:** `getNextCourseLessonInModule` returned `null` and the action tried to redirect to `undefined.slug`.
**Fix:** On `next === null`, redirect to `/course/[moduleSlug]` (the module index) instead.

## Verify

```bash
pnpm check
pnpm dev
# After granting yourself an entitlement:
curl -s -I http://localhost:5173/course/getting-started/welcome | head -n 1   # 200
curl -s -X POST -b 'forge_session=<sid>' \
  http://localhost:5173/course/getting-started/welcome?/complete -I | grep -i '^location:'
# expect: location: /course/getting-started/how-this-course-works
```

## Mistake log

- **First `readProgress` returned `JSON.parse(raw) as ProgressMap`.** `pnpm check` with strict mode flagged the implicit `any`. Rewrote to parse to `unknown`, iterate `Object.entries`, and shape-check each value before insert.
- **Set `httpOnly: true` on the progress cookie by copy-paste from `session.ts`.** Then hit the "show a subtle 'completed' tick on the sidebar without a refetch" use case and realized the client cannot read httpOnly cookies. Flipped to `false` deliberately (no security-sensitive content in the cookie).
- **Redirected to the next lesson by slug without re-querying the module.** When the very first attempt involved a lesson whose `orderIndex` had just been reordered by a reseed, the "next" slug pointed to a non-existent lesson. Route the next-lookup through the same module id, not any cached list from the load phase.
- **Rendered `{@html lesson.body}` as a first pass for Markdown.** Realized before merging that this is an XSS-shaped hole until a sanitizer is in place. Reverted to `{lesson.body}` with `white-space: pre-wrap` and noted the Markdown-rendering lesson in the follow-on list.

## Commit

```bash
git add src/lib/server/db/queries.ts src/routes/course/\[moduleSlug\]/\[lessonSlug\]/
git add curriculum/module-05-product/lesson-082-course-lesson-view.md
git commit -m "feat(routes): /course/[moduleSlug]/[lessonSlug] + progression cookie + lesson 082"
```

Four lessons ship the meta-course end-to-end. Next: subscription lifecycle UI (083).
