---
number: 33
slug: lesson-slug-route
title: Build the /lessons/[slug] individual lesson route
module: 3
moduleSlug: content-pipeline
moduleTitle: Content Pipeline
phase: 3
step: 5
previous: 32
next: null
estimatedMinutes: 25
filesTouched:
  - src/routes/lessons/[slug]/+page.ts
  - src/routes/lessons/[slug]/+page.svelte
  - svelte.config.js
---

## Context

Lesson 032's listing links to `/lessons/<slug>` URLs that don't yet resolve. This lesson implements the dynamic route that renders each lesson as its own page: the metadata header (breadcrumb, lesson number, title, time, module, files touched) plus the lesson body rendered via the Svelte component mdsvex produced at build time.

The route is `/lessons/[slug]`. SvelteKit matches any URL under `/lessons/...` to this dynamic segment and passes the matched value as `params.slug`. The `+page.ts` looks up the lesson via the loader's `getLesson(slug)` and returns `{ Component, meta }`. The `+page.svelte` renders the meta chrome and invokes the component via the dot-notation `<data.Component />` syntax Svelte 5 supports for dynamic components.

Three specifics that make this route a PE7 pattern rather than a rough sketch:

1. **Prerender every lesson.** `export const prerender = true` plus `export const entries = () => listLessons().map((l) => ({ slug: l.slug }))` produces a static HTML file for every lesson at build time. At runtime, requests to `/lessons/<slug>` hit a pre-rendered HTML file — zero template render cost.
2. **Typed 404 that matches `App.Error`.** The route throws `error(404, { message, errorId })` when the slug doesn't exist. The errorId is derived from the slug so operators searching logs can correlate reports quickly.
3. **`<data.Component />` dot-notation.** Svelte 5 supports this idiom for dynamic components without the legacy `<svelte:component this={Component} />`. It preserves reactivity on `data` changes (client-side navigation between lessons) without a `$derived` wrapper.

## The command

Create the dynamic route directory:

```bash
mkdir -p src/routes/lessons/\[slug\]
```

Write `src/routes/lessons/[slug]/+page.ts`:

```ts
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

export const prerender = true;

export const entries = () => listLessons().map((l) => ({ slug: l.slug }));
```

A few details:

- **`error(404, { message, errorId })`** — SvelteKit's `error` helper accepts an `App.Error` object, not a string. Our `App.Error` (declared in `src/app.d.ts` during lesson 015) requires both fields, so we pass both.
- **TypeScript flow.** `getLesson` returns `LessonModule | null`. After the `if (lesson === null)` check, TypeScript narrows `lesson` to `LessonModule` for the rest of the function — no cast needed.
- **`entries()` function.** Without it, SvelteKit crawls prerendered HTML for links and discovers slugs that way. With it, the full set is declared explicitly. Explicit is more robust — if the listing ever hides lessons (e.g., drafts), the crawler might miss them; `entries()` always runs.

Write `src/routes/lessons/[slug]/+page.svelte`:

```svelte
<script lang="ts">
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>{data.meta.title} — ForgeSchool</title>
  <meta name="description" content="Lesson {data.meta.number}: {data.meta.title}" />
</svelte:head>

<article class="lesson-page">
  <header class="lesson-header">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/lessons">Curriculum</a>
      <span aria-hidden="true"> / </span>
      <span>Module {data.meta.module} — {data.meta.moduleTitle}</span>
    </nav>
    <p class="lesson-number">Lesson {String(data.meta.number).padStart(3, '0')}</p>
    <h1>{data.meta.title}</h1>
    <dl class="lesson-meta"><!-- time, module, phase, files touched --></dl>
  </header>

  <div class="lesson-body">
    <data.Component />
  </div>

  <footer class="lesson-footer">
    <a href="/lessons" class="back-link">← All lessons</a>
  </footer>
</article>

<style>
  @layer components {
    .lesson-page { max-inline-size: 52rem; margin-inline: auto; padding-inline: 1.5rem; padding-block: 3rem; }
    /* ... breadcrumb, lesson-number, h1, meta-row, files, body-scoped :global rules ... */
  }
</style>
```

The `lesson-body` `<style>` uses Svelte's `:global(...)` selector to style the HTML mdsvex emits from the lesson markdown — headings (`h2`, `h3`), paragraphs, lists, code blocks, block quotes. Without `:global`, the scoped style wouldn't reach the mdsvex-generated elements because they aren't part of the `.svelte` component's own template.

Once both files are in place, remove the `kit.prerender.handleHttpError` tolerance from `svelte.config.js` that lesson 032 installed — every `/lessons/<slug>` link now resolves, so real 404s should fail the build as intended.

Verify:

```bash
pnpm check
pnpm build
pnpm dev  # visit http://localhost:5173/lessons/spec-the-product
```

Expected: 0 errors; build produces ~33 `/lessons/<slug>/index.html` files; dev renders lesson 001 with the meta header and the rendered lesson body.

## Why we chose this — the PE7 judgment

**Alternative 1: Server-side rendering on every request**
Drop `prerender` and render on each GET. Works. Also wastes CPU — the curriculum never changes without a rebuild, so the HTML is identical for the same commit. Prerendering at build time lets a CDN serve every lesson with zero Node runtime cost.

**Alternative 2: Parameter-driven `<svelte:component this={Component} />`**
Legacy Svelte 4 API. Works in Svelte 5 but flagged as deprecated. The dot-notation `<data.Component />` is the Svelte 5 idiom; it's shorter, reactive, and preserves the migration-safe convention.

**Alternative 3: Render lesson body as HTML and inject via `{@html}`**
This would mean pre-rendering each lesson to a static HTML string in the loader, then using `{@html renderedHtml}` in the page. It forfeits the Svelte component model — no embedded components, no runes-based demos inside lessons. Since Module 5+ lessons will embed interactive demos, we need the lesson to be a live Svelte component, not a string.

**Alternative 4: Skip `entries()` and rely on link-crawl discovery**
Works today because `/lessons` lists every slug. Breaks if the listing ever omits lessons (drafts, unreleased modules). Explicit `entries()` is a 1-line guarantee.

**Alternative 5: Put the body styles in `base.css`**
The styles for `h2`, `h3`, `p`, `ul` inside the lesson body are specifically tuned for the lesson-page reading experience — wider line-height, heading margins, list spacing. Base layer styles are the default across the app; lesson-specific tuning lives in the component where it applies. Scoped `:global(...)` inside `@layer components` is the correct PE7 placement.

The PE7 choice — dynamic route with prerender + explicit entries + typed App.Error + dot-notation component + :global-scoped body styles — wins because every lesson is a static HTML file served by the CDN, the error path is typed, the component API is the Svelte 5 idiom, and the styling is localized to the page.

## What could go wrong

**Symptom:** `error(404, 'string message')` produces a TypeScript error
**Cause:** SvelteKit's `error()` now requires an `App.Error` object matching our interface (`{ message, errorId }`), not a bare string.
**Fix:** Pass both fields: `error(404, { message: '...', errorId: '...' })`.

**Symptom:** `pnpm build` reports `500 /lessons/<slug>` on some specific lesson
**Cause:** The lesson markdown contains content mdsvex can't compile. Usually a bare `<` or `$` that needs escaping, or a triple-backtick block whose language tag conflicts with the highlighter.
**Fix:** Look at the offending lesson. Escape the problematic character. The plain highlighter installed in lesson 032 handles most cases but not all Markdown ambiguities.

**Symptom:** `pnpm dev` renders the page but the body is unstyled (all paragraphs same size as h2)
**Cause:** `:global(...)` selectors inside the `<style>` block are missing or misspelled.
**Fix:** Every selector that targets content inside `<data.Component />` must be wrapped in `:global(...)`, e.g., `.lesson-body :global(h2) { ... }`.

**Symptom:** Prerender fails on a lesson slug that exists in the filesystem but not in `getLesson(slug)`
**Cause:** The lesson has `draft: true` in frontmatter — the loader skips drafts when building the index.
**Fix:** Set `draft: false` (or remove the key) to include the lesson, or leave it excluded until it's ready.

## Verify

```bash
# Route files exist
ls src/routes/lessons/\[slug\]/
```
Expected: `+page.ts` and `+page.svelte`.

```bash
# Full build pass — every lesson prerenders
pnpm build
```
Expected: a `/lessons/<slug>/index.html` file per lesson in `.svelte-kit/output/prerendered/`.

```bash
# Dev preview
pnpm dev
# open http://localhost:5173/lessons/spec-the-product
```
Expected: lesson 001 renders with its breadcrumb, lesson number, title, metadata chips, and body prose.

```bash
# Type check clean
pnpm check
```
Expected: 0 errors.

## Mistake log — things that went wrong the first time I did this

- **Used `error(404, 'string')` instead of the object shape.** SvelteKit 2.x requires the body to match `App.Error`. Switched to `error(404, { message, errorId })`. The error surface is a little more ceremony but enforces the correlation-ID pattern the platform runs on.
- **Forgot that `<data.Component />` is legit Svelte 5 syntax.** First pass used the legacy `<svelte:component this={data.Component} />`. Compiler warned it's deprecated. Replaced with dot-notation. Shorter and cleaner.
- **Wrote scoped `<style>` rules that didn't affect the lesson body.** Svelte scopes selectors to the component's own DOM; mdsvex-rendered HTML is "outside" the component's generated classes. Wrapped every body selector in `:global(...)`. The styles took effect immediately.
- **Dropped `export const entries` on the first pass.** Dev worked. Build worked (prerender discovered slugs by crawling the listing). Then I added a "draft" lesson that was excluded from the listing — the build silently didn't prerender it. Added `entries()` as the explicit enumerator; the invariant is now stable against listing changes.

## Commit this change

```bash
git add src/routes/lessons/\[slug\]/ svelte.config.js
git add curriculum/module-03-content-pipeline/lesson-033-lesson-slug-route.md
git commit -m "feat(routes): /lessons/[slug] per-lesson page + lesson 033"
```

Every lesson in the curriculum now renders as its own static HTML page with breadcrumb navigation back to the listing. Lesson 034 replaces the bare plainHighlighter with a shiki-backed one so fenced code blocks render with real syntax color in the lesson body.
