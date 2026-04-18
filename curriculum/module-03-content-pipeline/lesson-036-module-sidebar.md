---
number: 36
slug: module-sidebar
title: Add the per-module sidebar navigation
module: 3
moduleSlug: content-pipeline
moduleTitle: Content Pipeline
phase: 3
step: 8
previous: 35
next: 37
estimatedMinutes: 15
filesTouched:
  - src/lib/components/course/ModuleSidebar.svelte
  - src/routes/lessons/[slug]/+page.ts
  - src/routes/lessons/[slug]/+page.svelte
---

## Context

Prev/next moves you one lesson at a time. A student deep in Module 2 may want to skip from lesson 018 (install-drizzle) to lesson 026 (first-vitest-test) in one click. The per-module sidebar lists every lesson in the currently-viewed module so jumping is one click regardless of position.

This lesson introduces the first reusable component in `src/lib/components/course/` — `ModuleSidebar.svelte`. Positioning is sticky on desktop (≥1024px / lg breakpoint) so scrolling the lesson body leaves the sidebar in place; the sidebar simply hides below lg because a phone screen doesn't have room for a 16rem sidebar AND a readable 52rem lesson body.

## The command

Create `src/lib/components/course/ModuleSidebar.svelte`:

```svelte
<script lang="ts">
  import type { LessonMeta, ModuleIndex } from '$lib/curriculum';

  type Props = { module: ModuleIndex; currentSlug: string };
  let { module: mod, currentSlug }: Props = $props();
  let isCurrent = $derived.by(() => (slug: string) => slug === currentSlug);
</script>

<aside class="module-sidebar" aria-label="Module navigation">
  <header class="sidebar-header">
    <p class="sidebar-eyebrow">Module {mod.number}</p>
    <h2 class="sidebar-title">{mod.title}</h2>
    <p class="sidebar-meta">{mod.lessons.length} lessons</p>
  </header>
  <ol class="sidebar-lessons">
    {#each mod.lessons as lesson (lesson.number)}
      {@const current = isCurrent(lesson.slug)}
      <li class="sidebar-item" class:current>
        <a href="/lessons/{lesson.slug}" aria-current={current ? 'page' : undefined}>
          <span class="item-num">{String(lesson.number).padStart(3, '0')}</span>
          <span class="item-title">{lesson.title}</span>
        </a>
      </li>
    {/each}
  </ol>
</aside>
```

Two details:

- **`module: mod`** — the prop is named `module`, but `module` is also a reserved word in TypeScript. We alias locally to `mod`. Callers pass `module={data.module}`; the component reads `mod`.
- **`aria-current={current ? 'page' : undefined}`** — the current-lesson link is marked with the standard ARIA attribute. Screen readers announce "current page" for the active lesson.

Styles (inside `@layer components`): sticky position with a `calc(100dvh - 4rem)` max-block-size and `overflow-y: auto` so a very long module scrolls internally; the current item gets a `--color-primary-50` background and brand-color text.

Update `src/routes/lessons/[slug]/+page.ts` to resolve the current lesson's module:

```diff
-import { getLesson, getLessonByNumber, listLessons } from '$lib/curriculum';
+import { getLesson, getLessonByNumber, getModule, listLessons } from '$lib/curriculum';
 // ...
   const next = lesson.meta.next !== null ? getLessonByNumber(lesson.meta.next) : null;
+  const module = getModule(lesson.meta.moduleSlug);
   return {
     Component: lesson.Component,
     meta: lesson.meta,
+    module,
     prev: ...,
     next: ...
   };
```

Update `src/routes/lessons/[slug]/+page.svelte` to render the sidebar in a two-column grid layout:

```diff
+<script lang="ts">
+  import ModuleSidebar from '$lib/components/course/ModuleSidebar.svelte';
+  // ...
+</script>

-<article class="lesson-page">
+<div class="lesson-layout">
+  {#if data.module !== null}
+    <ModuleSidebar module={data.module} currentSlug={data.meta.slug} />
+  {/if}
+  <article class="lesson-page">
     <!-- lesson header, body, nav, footer unchanged -->
-</article>
+  </article>
+</div>
```

CSS: `.lesson-layout` is a grid that stacks vertically below 1024px and becomes `grid-template-columns: 16rem 1fr` at lg+. `.lesson-page` drops its own `max-inline-size` container (now provided by `.lesson-layout`) but keeps a `max-inline-size: 52rem` inner cap and `justify-self: center` so the reading column stays centered in the 1fr track.

Verify:

```bash
pnpm check
pnpm build
pnpm dev  # /lessons/install-drizzle
```

Expected: on ≥1024px, a sidebar appears on the left listing every Module 2 lesson; the currently-viewed lesson (`install-drizzle`) is highlighted with brand color and background. Below 1024px, the sidebar hides; prev/next nav still appears at the bottom.

## Why we chose this — the PE7 judgment

**Alternative 1: Sidebar in the root layout instead of the lesson page**
The sidebar is module-scoped — it only makes sense on a lesson page. A root-layout sidebar would need conditional rendering based on the route, which is exactly what "render it only on this route" means. Keep it on the route.

**Alternative 2: Show all 8 modules in the sidebar, not just the current one**
A single-module view keeps the sidebar's information density tight (16 lessons fit; 170 don't). For cross-module navigation, `/lessons` is one click away via the breadcrumb.

**Alternative 3: Off-canvas drawer on mobile**
We hide the sidebar below lg. A toggle-able drawer would surface module navigation on mobile too. Worth building — in Module 6's marketing+polish work, with Motion animating the open/close. For now, the mobile fallback is "tap Curriculum in the breadcrumb, scroll, tap a lesson" — two extra taps but no lost functionality.

**Alternative 4: Use `<details>` / `<summary>` for native collapsible**
The sidebar is always expanded; collapsing would hide the whole point. Not applicable here.

**Alternative 5: Put the module sidebar in a server-only load**
Universal load is fine — `getModule` is a pure query against the in-memory loader, no secrets.

The PE7 choice — dedicated ModuleSidebar component, sticky at lg+, hidden below lg, current lesson marked via aria-current and brand color — wins because it's scoped to where it's useful, responsive without a mobile burden, and accessible out of the box.

## What could go wrong

**Symptom:** TypeScript rejects `prop: module` as a reserved word
**Cause:** `module` is a reserved identifier in strict mode ESM.
**Fix:** Alias locally: `let { module: mod } = $props()`. Callers pass `module={...}`; the component uses `mod`.

**Symptom:** Current lesson not highlighted
**Cause:** `currentSlug` isn't matching `lesson.slug`. Usually a wrong prop value from the parent.
**Fix:** Pass `currentSlug={data.meta.slug}` (not `data.meta.number` or `params.slug`). The slug is the canonical ID.

**Symptom:** Sidebar scrolls with the body on a tall page
**Cause:** Missing `position: sticky` + `inset-block-start: Xrem`.
**Fix:** Both on `.module-sidebar`. Also ensure the grid parent (`.lesson-layout`) has `align-items: start` (or doesn't stretch).

**Symptom:** Sidebar pushes the reading column off-center
**Cause:** The outer `.lesson-layout` has a fixed width tight enough that the 16rem sidebar pushes the 52rem reading column to the right.
**Fix:** Use `max-inline-size: 80rem` on `.lesson-layout` and `justify-self: center` on `.lesson-page` so the reading column stays visually centered even when the sidebar is present.

## Verify

```bash
pnpm check
pnpm build
pnpm dev  # visit /lessons/install-drizzle (Module 2 lesson)
```

Expected:
- At window widths ≥1024px: sidebar lists all Module 2 lessons on the left; `install-drizzle` row is highlighted.
- At widths below 1024px: sidebar hidden, lesson body full-width.
- Clicking a sidebar lesson navigates; the new page's sidebar highlights the newly-active lesson.
- Screen reader announces "current page" on the active sidebar link (aria-current).

## Mistake log — things that went wrong the first time I did this

- **Named the prop `module` directly without alias.** TypeScript's strict mode treats `module` as reserved in module scope. Aliased via destructure: `let { module: mod }: Props = $props()`.
- **Hard-coded `max-block-size: calc(100vh - ...)` with `vh`.** iOS Safari's 100vh includes the browser chrome, so the sidebar extended behind the address bar. Switched to `100dvh` (dynamic viewport height) which Safari now supports (iOS 16+).
- **Used `lesson.number === currentNumber` instead of `slug`.** Worked. Also meant the loader had to pass `currentNumber` through. Simpler to compare slugs — both the route param and the lesson meta have slugs.
- **Forgot `min-width: 0` on `.lesson-page`.** A code block wider than the column pushed the sidebar off-screen on narrow laptops. `min-width: 0` on a grid child lets it shrink below its content width, engaging the code block's `overflow-x: auto` scroll.

## Commit this change

```bash
git add src/lib/components/course/ModuleSidebar.svelte \
       src/routes/lessons/\[slug\]/+page.ts \
       src/routes/lessons/\[slug\]/+page.svelte
git add curriculum/module-03-content-pipeline/lesson-036-module-sidebar.md
git commit -m "feat(content): add per-module sidebar navigation + lesson 036"
```

Desktop readers can now scan an entire module and jump anywhere in one click. Lesson 037 builds the course landing page at `/` so first-time visitors see the product, not the iconography smoke test from lesson 012.
