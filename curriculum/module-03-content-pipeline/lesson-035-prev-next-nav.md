---
number: 35
slug: prev-next-nav
title: Add per-lesson prev/next navigation
module: 3
moduleSlug: content-pipeline
moduleTitle: Content Pipeline
phase: 3
step: 7
previous: 34
next: 36
estimatedMinutes: 10
filesTouched:
  - src/routes/lessons/[slug]/+page.ts
  - src/routes/lessons/[slug]/+page.svelte
---

## Context

A student reading lesson 023 shouldn't have to click back to the listing to find lesson 024. The `previous` and `next` fields the loader maintains per lesson give us exactly the data a pair of navigation links needs. We pass the neighbor titles + slugs through `+page.ts`, render them as a two-column nav at the bottom of every lesson page, and the curriculum becomes a book you can read straight through.

This lesson extends the existing `/lessons/[slug]` route. No new routes, no new components — just a data addition in the load function and a markup block in the page template.

## The command

Extend `src/routes/lessons/[slug]/+page.ts` to resolve the neighbors:

```ts
import { error } from '@sveltejs/kit';
import { getLesson, getLessonByNumber, listLessons } from '$lib/curriculum';

export const load = ({ params }) => {
  const lesson = getLesson(params.slug);
  if (lesson === null) error(404, { message: `Lesson "${params.slug}" not found`, errorId: `lesson-not-found-${params.slug}` });

  const prev = lesson.meta.previous !== null ? getLessonByNumber(lesson.meta.previous) : null;
  const next = lesson.meta.next !== null ? getLessonByNumber(lesson.meta.next) : null;

  return {
    Component: lesson.Component,
    meta: lesson.meta,
    prev: prev === null ? null : { slug: prev.meta.slug, title: prev.meta.title, number: prev.meta.number },
    next: next === null ? null : { slug: next.meta.slug, title: next.meta.title, number: next.meta.number }
  };
};
```

Only the slug/title/number fields are forwarded — not the full `LessonMeta` — because the client side doesn't need the rest and smaller payloads mean faster hydration. (Not a concern for a prerendered page, but a good habit.)

Add the nav block to `src/routes/lessons/[slug]/+page.svelte` between the lesson body and the "back to listing" footer:

```svelte
<nav class="lesson-nav" aria-label="Lesson navigation">
  {#if data.prev !== null}
    <a href="/lessons/{data.prev.slug}" class="nav-link nav-prev">
      <span class="nav-label">← Previous</span>
      <span class="nav-target">
        <span class="nav-num">{String(data.prev.number).padStart(3, '0')}</span>
        <span class="nav-title">{data.prev.title}</span>
      </span>
    </a>
  {:else}
    <span class="nav-placeholder"></span>
  {/if}
  {#if data.next !== null}
    <a href="/lessons/{data.next.slug}" class="nav-link nav-next">
      <span class="nav-label">Next →</span>
      <span class="nav-target">
        <span class="nav-num">{String(data.next.number).padStart(3, '0')}</span>
        <span class="nav-title">{data.next.title}</span>
      </span>
    </a>
  {:else}
    <span class="nav-placeholder"></span>
  {/if}
</nav>
```

Two things:

- **`{:else} <span class="nav-placeholder"></span>`** — the first and last lessons have no prev or next. A placeholder keeps the 2-column grid alignment so the existing link doesn't collapse to full-width.
- **`aria-label="Lesson navigation"`** — screen readers announce the block as a distinct landmark, not yet another orphan link group.

Scoped styles (inside `@layer components`) give the links a card-like treatment with hover affordance:

```css
.lesson-nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-block-start: 3rem;
  padding-block-start: 2rem;
  border-block-start: 1px solid var(--color-border);
}
.nav-link {
  display: grid;
  gap: 0.25rem;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--color-fg);
}
.nav-link:hover {
  border-color: var(--color-brand);
  background-color: var(--color-bg-sunken);
}
.nav-next { text-align: end; }
```

Verify:

```bash
pnpm check
pnpm build
```

Open any lesson in dev. At the bottom: two cards — "Previous" on the left, "Next" on the right. Lesson 001 shows only a next card (prev is null). The final lesson shows only a prev card.

## Why we chose this — the PE7 judgment

**Alternative 1: Single "Next lesson →" link only**
Simpler. Also forces students to return to the listing to go backward. Two-way navigation is the UX standard; the tiny amount of extra markup is worth it.

**Alternative 2: Put prev/next in a sticky sidebar**
Lesson 036 adds a module sidebar. The prev/next pair serves a different purpose: "continue reading" versus "jump to another lesson." A bottom-of-page prev/next is the standard book-reading pattern; a sidebar is for overview navigation. They coexist.

**Alternative 3: Include prev/next title prose in the page header**
"Previous: 034 — Shiki" at the top. Adds visual noise to the header. Keeping it at the bottom matches the reading flow: you finish the lesson, decide what to do next.

**Alternative 4: Pass the full prev/next `LessonMeta` objects**
Every consumer only uses slug + title + number. Forwarding full objects costs payload and leaks more fields than needed. A small projection is the right interface.

The PE7 choice — bottom-of-page two-column prev/next with null-placeholder fallback — wins because it matches how books read and keeps the markup minimal.

## What could go wrong

**Symptom:** Grid collapses to one column on lesson 001 (no prev)
**Cause:** Without a placeholder, the sole `.nav-link` fills the first grid cell and the second is empty.
**Fix:** The `{:else} <span class="nav-placeholder"></span>` branch preserves the 2-column shape. Its CSS (`display: block`) gives the grid an explicit second child.

**Symptom:** Prev/next link to a slug that 404s
**Cause:** A lesson's frontmatter `previous`/`next` references a lesson that was deleted or renamed.
**Fix:** Loader validation (lesson 031) catches this at build time — it throws on unresolved chains. If you see a runtime 404 on a nav click, the loader validation is broken; add a test.

**Symptom:** On client-side nav between lessons, the body renders but the nav doesn't update
**Cause:** Svelte treated the nav as a static snapshot because we destructured `data.prev` / `data.next` with `const` somewhere.
**Fix:** Access via `data.prev` / `data.next` directly in the template. The `let { data } = $props()` keeps the reference reactive.

## Verify

```bash
pnpm check
pnpm build
pnpm dev  # navigate to /lessons/install-drizzle
```

Expected: two cards at the bottom — left links to lesson 017 (docker-postgres), right links to lesson 019 (design-schema). Both click through correctly.

## Mistake log — things that went wrong the first time I did this

- **Forwarded the entire `LessonMeta` object** for prev/next. Payload bloat. Projected down to slug/title/number; everything the UI needs, nothing it doesn't.
- **Left the `{:else}` branch empty.** The grid collapsed lesson 001's next card to full-width. Added a `<span class="nav-placeholder"></span>` fallback.
- **Styled `.nav-next` with `justify-self: end` on the link.** Worked in Chrome; Firefox ignored it because the link was already `display: grid`. Switched to `text-align: end` on the outer anchor plus `display: grid` on the inner `.nav-target` — consistent across browsers.
- **Omitted `aria-label="Lesson navigation"`.** Screen reader announced "navigation" with no context, then two links. Adding the label gives it a name a user can jump to with their landmark-nav command.

## Commit this change

```bash
git add src/routes/lessons/\[slug\]/+page.ts src/routes/lessons/\[slug\]/+page.svelte
git add curriculum/module-03-content-pipeline/lesson-035-prev-next-nav.md
git commit -m "feat(content): add prev/next lesson navigation + lesson 035"
```

Readers can now move forward or backward through the curriculum without round-tripping to the listing. Lesson 036 layers a module-scoped sidebar on top so jumping around within a module is equally cheap.
