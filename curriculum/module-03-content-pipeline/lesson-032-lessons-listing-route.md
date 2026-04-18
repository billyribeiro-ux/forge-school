---
number: 32
slug: lessons-listing-route
title: Build the /lessons listing route
module: 3
moduleSlug: content-pipeline
moduleTitle: Content Pipeline
phase: 3
step: 4
previous: 31
next: 33
estimatedMinutes: 20
filesTouched:
  - src/routes/lessons/+page.ts
  - src/routes/lessons/+page.svelte
  - svelte.config.js
  - curriculum/module-01-foundation/lesson-004-lock-pnpm.md
  - curriculum/module-02-data/lesson-021-generate-first-migration.md
  - curriculum/module-02-data/lesson-022-run-first-migration.md
---

## Context

The loader works. Now we build the first route that consumes it: `/lessons` — the table-of-contents page listing every module with its lessons. This is the entry point students see when they browse the curriculum: a sectioned list, each module a card, each lesson a link. Links go to `/lessons/[slug]` (lesson 033 adds the per-lesson page).

Two meaningful concerns this lesson also solves:

1. **mdsvex + template-literal escape.** mdsvex wraps compiled code blocks in Svelte `{@html \`...\`}` template literals. Default Prism highlighting emits HTML that contains raw `$` characters, which JavaScript interprets as template-literal substitutions at render time — producing a build-time "reference error" if any emitted code contains shell-variable syntax or JS template expressions. We install a minimal pre-shiki highlighter that pipes code through `escapeSvelte` from mdsvex, which correctly escapes backticks and dollar signs. Lesson 034 replaces this with a full shiki integration; for now we just need the build not to explode.

2. **Prose-level `<` escaping.** Three lessons in Modules 1-2 used a bare `<` in prose — phrases of the shape `Node <space> 22.11`, `Postgres <space> 13`, and `psql <space> file.sql` — where the `<` is a literal comparison or shell redirect. mdsvex's Markdown parser interprets those as the start of malformed HTML tags and errors at parse time. Fix: rewrite the three sentences to use "earlier than" or avoid bare `<` in prose entirely. Inline backtick-delimited code blocks with `<` would also work if the parser were stricter; the prose rewrite is the simpler fix.

With these two unblockers in place, the listing route renders, and the build succeeds.

## The command

Fix the mdsvex highlighter. Edit `svelte.config.js`:

```diff
-import { mdsvex } from 'mdsvex';
+import { mdsvex, escapeSvelte } from 'mdsvex';

+/**
+ * Minimal pre-shiki highlighter. mdsvex wraps the returned string inside a
+ * Svelte template literal (`{@html \`...\`}`), so every backtick and dollar
+ * sign we emit must be pre-escaped. escapeSvelte handles that.
+ * Lesson 034 replaces this with a shiki-based highlighter.
+ */
+function plainHighlighter(code, lang) {
+  const safe = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
+  const wrapped = `<pre class="language-${lang ?? 'text'}"><code>${safe}</code></pre>`;
+  return escapeSvelte(wrapped);
+}

 const mdsvexOptions = {
   extensions: ['.md', '.svx'],
-  smartypants: { dashes: 'oldschool' }
+  smartypants: { dashes: 'oldschool' },
+  highlight: { highlighter: plainHighlighter }
 };
```

Also add a tolerant `handleHttpError` to the kit's prerender config, so the `/lessons` page's dangling links to `/lessons/[slug]` (which lesson 033 builds) don't fail the build:

```diff
 kit: {
   adapter: adapter(),
+  prerender: {
+    handleHttpError: ({ path, referrer, message }) => {
+      if (path.startsWith('/lessons/')) {
+        console.warn(`[prerender] ${message} (from ${referrer}) — expected until lesson 033`);
+        return;
+      }
+      throw new Error(message);
+    }
+  }
 }
```

Rewrite the three `<`-in-prose sentences — in each, replace the bare `<` with "earlier than" or reshape the clause entirely:

- `curriculum/module-01-foundation/lesson-004-lock-pnpm.md` — the "Node version" sentence becomes "refuses to install on Node earlier than 22.11"
- `curriculum/module-02-data/lesson-021-generate-first-migration.md` — the "Older Postgres versions" parenthetical becomes "(earlier than 13)"
- `curriculum/module-02-data/lesson-022-run-first-migration.md` — the `psql`-with-file sentence becomes "by running `psql` with the SQL file piped in"

Create the route. `src/routes/lessons/+page.ts`:

```ts
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

// Curriculum is a build-time constant; prerender statically.
export const prerender = true;
```

Two details:
- **Import uses bare `$lib/curriculum`, not `$lib/curriculum/index.ts`.** The `.ts` extension is required on *relative* imports (PE7 tsconfig's `rewriteRelativeImportExtensions`); it's forbidden on aliased imports because the rewrite doesn't apply to non-relative paths.
- **`prerender: true`** flags this route as a static page. SvelteKit visits it at build time and writes the resulting HTML to disk. At runtime the server serves the cached HTML with zero template-render cost.

`src/routes/lessons/+page.svelte` renders the hero + the list of modules:

```svelte
<script lang="ts">
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  let totalHours = $derived(Math.round((data.totalMinutes / 60) * 10) / 10);
</script>

<svelte:head>
  <title>Curriculum — ForgeSchool</title>
</svelte:head>

<article class="lessons-index">
  <header class="hero">
    <p class="eyebrow">ForgeSchool</p>
    <h1>The Curriculum</h1>
    <p class="lede">
      {data.totalLessons} lessons across {data.modules.length} modules. Every lesson
      is one atomic commit; every commit is one reviewable change.
      Roughly {totalHours} hours of deliberate work from blank repo to shipped product.
    </p>
  </header>

  <ol class="modules">
    {#each data.modules as mod (mod.number)}
      <li class="module">
        <header class="module-header">
          <p class="module-eyebrow">Module {mod.number}</p>
          <h2>{mod.title}</h2>
          <p class="module-meta">
            {mod.lessons.length} lessons ·
            {mod.lessons.reduce((s, l) => s + l.estimatedMinutes, 0)} minutes
          </p>
        </header>
        <ol class="lesson-list">
          {#each mod.lessons as lesson (lesson.number)}
            <li class="lesson-row">
              <a href="/lessons/{lesson.slug}" class="lesson-link">
                <span class="lesson-number">{String(lesson.number).padStart(3, '0')}</span>
                <span class="lesson-title">{lesson.title}</span>
                <span class="lesson-time">{lesson.estimatedMinutes}m</span>
              </a>
            </li>
          {/each}
        </ol>
      </li>
    {/each}
  </ol>
</article>
```

The `<style>` block (inside the component) wraps all rules in `@layer components { ... }` per the cascade rules from lesson 011.

**Svelte 5 rune caveat** — `let { data }: PageProps = $props()` instead of `const { data }`. A `const` destructure captures the initial data value; if `data` later changes (via client-side navigation), the destructured locals go stale. `let` preserves reactivity, and downstream computations derived from `data` use `$derived(...)`.

Verify:

```bash
pnpm check
pnpm build
pnpm dev    # visit http://localhost:5173/lessons
```

Expected: 0 errors on check; build completes; dev server renders the listing with 30 lessons across 3 modules.

## Why we chose this — the PE7 judgment

**Alternative 1: Server-side load via `+page.server.ts`**
Server load forces every request through the server, even for static data. Our curriculum is frozen at build time — `+page.ts` (universal) plus `prerender: true` lets SvelteKit write a static HTML file at build time and serve it from the CDN forever. A `+page.server.ts` would defeat the prerendering opportunity.

**Alternative 2: Skip the universal load; render in the component directly**
Importing `listModules()` in the `<script>` block of the `.svelte` file works. It also misses SvelteKit's data-serialization contract — a `+page.ts` explicitly declares what data the page consumes. Routes get typed `PageData` for free via `./$types`. Keep the load / render split.

**Alternative 3: Paginate or lazy-render the lesson list**
For 30 lessons this is premature. For 170+ lessons on a 4K monitor, it still fits in two visible screens. Pagination adds URL state, loading indicators, and keyboard-nav complexity. The flat list is actually the most skimmable view — don't complicate it.

**Alternative 4: Use a separate `/curriculum` or `/modules` URL**
`/lessons` was the name in `docs/ARCHITECTURE.md §5`. Changing it here would require updating the doc, the spec, and the navbar (which doesn't exist yet). Stick with `/lessons`.

**Alternative 5: Keep the default mdsvex Prism highlighter; escape dollar signs in lesson source**
"Just don't use `$f` in bash blocks." Works until the first real curriculum lesson that needs a shell variable. Three existing lessons already use shell expansion; Module 5's load-test lesson will use it heavily. Fixing the highlighter once is one edit; escaping every dollar sign in every future bash block is a lifetime of footguns.

The PE7 choice — universal `+page.ts` load, prerendered, custom mdsvex highlighter that survives template-literal wrapping — wins because it serves static content from the CDN, types data end-to-end, and doesn't surprise the author with shell-expansion build failures.

## What could go wrong

**Symptom:** `pnpm build` fails with `Error: 404 /lessons/<slug>` during prerender
**Cause:** The listing renders links to `/lessons/<slug>` pages that don't exist yet (lesson 033 adds them).
**Fix:** The `handleHttpError` in `svelte.config.js` converts these into warnings. If you see a hard error instead, confirm the handler is in place and matches the path.

**Symptom:** `pnpm check` errors with `This import uses a '.ts' extension to resolve... but will not be rewritten during emit because it is not a relative path`
**Cause:** The aliased import `$lib/curriculum/index.ts` has a `.ts` extension. Aliases skip the import-extension rewrite.
**Fix:** Drop the extension: `import { listModules } from '$lib/curriculum'`. Relative imports still need the `.ts`; aliased imports don't.

**Symptom:** Build error on a mdsvex-rendered bash block that contains `$variable`
**Cause:** The default Prism highlighter emits HTML containing raw `$`, which breaks mdsvex's template-literal wrapping.
**Fix:** The `plainHighlighter` in `svelte.config.js` pipes output through `escapeSvelte` from mdsvex, which handles the escape. Confirm the config includes `highlight: { highlighter: plainHighlighter }`.

**Symptom:** A lesson with a prose `<` (for example, the words `Node` and `22` with a less-than in between) fails parsing
**Cause:** Markdown treats `<` as the start of an HTML tag if it's followed by a letter or valid tag char. A bare less-than followed by a space plus digits is malformed HTML.
**Fix:** Rewrite the prose: "Node earlier than 22" or "Node ≤ 22" or use `&lt;` / `\<` escapes. Rule: no bare `<` in prose; use comparison words.

**Symptom:** Clicking a lesson link in dev 404s
**Cause:** `/lessons/<slug>` route doesn't exist yet — lesson 033 adds it.
**Fix:** Wait for lesson 033. This lesson deliberately ships with dangling links; the prerender tolerates them.

## Verify

```bash
# Route files exist
ls src/routes/lessons/+page.ts src/routes/lessons/+page.svelte
```

```bash
# Types and build clean
pnpm check
pnpm build
```
Expected: 0 type errors; build succeeds (with expected 404 warnings for `/lessons/<slug>`).

```bash
# Dev server renders the listing
pnpm dev
# open http://localhost:5173/lessons
```
Expected: 30 lessons across 3 modules render as a nested list. Each lesson link goes to `/lessons/<slug>` (404 until lesson 033).

## Mistake log — things that went wrong the first time I did this

- **Used `$lib/curriculum/index.ts` with the `.ts` extension.** Relative imports require it under our tsconfig's `rewriteRelativeImportExtensions`, so I assumed alias imports needed it too. They don't — aliases aren't rewritten. Dropped the extension. The error message is specific enough to pinpoint the fix.
- **Destructured `data` with `const`** in the `<script>` block. svelte-autofixer flagged "reference only captures the initial value." Changed to `let { data }: PageProps = $props();` so reactive navigation updates the data, and used `$derived(...)` for the `totalHours` computation.
- **Forgot that mdsvex wraps code output in a Svelte template literal.** Debugged a cryptic build error for ten minutes before realizing a bash block with `$f` was being interpreted as JavaScript template substitution. The `escapeSvelte` utility is exported specifically for this; wired it in.
- **Made `/lessons` fail the whole build because of the dangling `/lessons/<slug>` links.** Needed a prerender `handleHttpError` tolerant to those specific paths. Lesson 033 will remove the warning by implementing the route.

## Commit this change

```bash
git add svelte.config.js src/routes/lessons/ \
       curriculum/module-01-foundation/lesson-004-lock-pnpm.md \
       curriculum/module-02-data/lesson-021-generate-first-migration.md \
       curriculum/module-02-data/lesson-022-run-first-migration.md
git add curriculum/module-03-content-pipeline/lesson-032-lessons-listing-route.md
git commit -m "feat(routes): /lessons table of contents + mdsvex highlighter fix + lesson 032"
```

Users can now browse the full curriculum at `/lessons`. Lesson 033 makes every link land on an actual rendered lesson.
