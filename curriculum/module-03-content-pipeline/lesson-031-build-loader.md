---
number: 31
slug: build-loader
title: Build the curriculum loader
module: 3
moduleSlug: content-pipeline
moduleTitle: Content Pipeline
phase: 3
step: 3
previous: 30
next: 32
estimatedMinutes: 25
filesTouched:
  - src/lib/curriculum/index.ts
  - tests/curriculum.test.ts
---

## Context

With the corpus normalized (lesson 030), the curriculum is a set of Markdown files each carrying a YAML frontmatter block that the loader can read. This lesson builds the loader: a single typed TypeScript module that ingests every lesson at build time, validates the frontmatter shape and the prev/next chain, and exposes a small set of query functions the routes consume.

The loader runs at **build time**, not at request time. Vite's `import.meta.glob` inlines the full set of lessons during the build; no filesystem reads happen at runtime. Routes that call `listModules()` or `getLesson(slug)` get a pre-computed, in-memory table of contents. If a lesson has malformed frontmatter, the build fails — not a 500 at 2am.

The loader lives at `src/lib/curriculum/index.ts` (not under `src/lib/server/`) because routes call it from both universal (`+page.ts`) and server (`+page.server.ts`) load functions. The implementation uses only Vite's glob API and Svelte's type primitives; nothing about it is server-specific.

## The command

Create `src/lib/curriculum/index.ts`. The file has four parts:

**1. Types** — `LessonMeta`, `LessonModule`, `ModuleIndex`, matching the surface documented in `docs/CURRICULUM.md §5`.

**2. Validation** — a guard function `assertLessonMeta` that throws on any missing required key:

```ts
const REQUIRED_KEYS: readonly (keyof LessonMeta)[] = [
  'number', 'slug', 'title', 'module', 'moduleSlug', 'moduleTitle',
  'phase', 'step', 'previous', 'next', 'estimatedMinutes', 'filesTouched'
];

function assertLessonMeta(
  path: string,
  meta: Record<string, unknown> | undefined
): asserts meta is LessonMeta {
  if (meta === undefined) throw new Error(`[curriculum] ${path}: missing frontmatter`);
  for (const key of REQUIRED_KEYS) {
    if (!(key in meta)) throw new Error(`[curriculum] ${path}: missing "${key}"`);
  }
  if (!Array.isArray(meta['filesTouched'])) {
    throw new Error(`[curriculum] ${path}: filesTouched must be an array`);
  }
}
```

The `asserts meta is LessonMeta` return type is TypeScript's assertion-function syntax. After calling `assertLessonMeta(path, raw.metadata)`, TypeScript narrows `raw.metadata` to `LessonMeta` for the rest of the function.

**3. Corpus build** — iterate the glob, validate, de-duplicate, sort:

```ts
const rawModules = import.meta.glob<RawModule>('/curriculum/**/lesson-*.md', { eager: true });

const lessons: LessonModule[] = [];
const lessonsBySlug = new Map<string, LessonModule>();
const lessonsByNumber = new Map<number, LessonModule>();

for (const [sourcePath, raw] of Object.entries(rawModules)) {
  assertLessonMeta(sourcePath, raw.metadata);
  const meta = raw.metadata;
  if (meta.draft === true) continue;
  if (lessonsBySlug.has(meta.slug)) throw new Error(`[curriculum] duplicate slug "${meta.slug}"`);
  if (lessonsByNumber.has(meta.number)) throw new Error(`[curriculum] duplicate number ${meta.number}`);
  const lesson = { Component: raw.default, meta, sourcePath };
  lessons.push(lesson);
  lessonsBySlug.set(meta.slug, lesson);
  lessonsByNumber.set(meta.number, lesson);
}

lessons.sort((a, b) => a.meta.number - b.meta.number);

// Chain integrity
for (const lesson of lessons) {
  if (lesson.meta.previous !== null && !lessonsByNumber.has(lesson.meta.previous)) {
    throw new Error(`[curriculum] ${lesson.sourcePath}: previous=${lesson.meta.previous} does not resolve`);
  }
  if (lesson.meta.next !== null && !lessonsByNumber.has(lesson.meta.next)) {
    throw new Error(`[curriculum] ${lesson.sourcePath}: next=${lesson.meta.next} does not resolve`);
  }
}
```

**4. Public surface** — five query functions, all synchronous:

```ts
export function listModules(): ModuleIndex[] { return modules; }
export function getModule(moduleSlug: string): ModuleIndex | null { /* ... */ }
export function listLessons(): LessonMeta[] { /* ... */ }
export function getLesson(slug: string): LessonModule | null { /* ... */ }
export function getLessonByNumber(n: number): LessonModule | null { /* ... */ }
```

Add a smoke-test at `tests/curriculum.test.ts`. Five `it` blocks:

1. **indexes the Foundation and Data modules** — `listModules()` returns at least the three known modules.
2. **returns a module by slug with its lessons ordered by number** — `getModule('foundation')` returns Module 1 with lessons sorted.
3. **looks up lessons by slug and by number** — both accessors return the same lesson (by content).
4. **enforces prev/next chain integrity across the full corpus** — for every lesson, previous and next (when non-null) resolve to existing lessons.
5. **lesson 1 has no previous; the final lesson has no next** — the ends of the chain are null.

Run the suite:

```bash
pnpm check   # type + Svelte check still clean
pnpm test    # 3 prior DB tests + 5 new curriculum tests = 8 passing
pnpm build   # build still succeeds
```

## Why we chose this — the PE7 judgment

**Alternative 1: Lazy `import.meta.glob` and async query functions**
Vite's glob has an `eager: true` flag that inlines modules at build time and a default lazy mode that returns a map of `() => Promise<Module>` loaders. Lazy is better for huge corpora (thousands of lessons); eager is better for ours (~170). With eager, `listModules()` is synchronous and instant. With lazy, every caller becomes `await`-ed. For v1's scale, the eager loader is strictly simpler and the client-bundle cost is acceptable. We'll revisit if the curriculum grows past ~500 lessons.

**Alternative 2: Server-only loader with runtime filesystem reads**
A `readdir`-based loader that scans `curriculum/` at server startup. Works in Node, breaks on edge deployments (Cloudflare Workers, Vercel Edge) where the filesystem isn't available at runtime. Vite's glob bakes the import list into the bundle — portable across every target we'll deploy to in Module 8.

**Alternative 3: Runtime lesson resolution via `fetch()` of a pre-built JSON manifest**
A build step writes a `curriculum.json` file; the app fetches it at runtime. Adds a build step, adds a fetch round-trip, adds a serialization boundary. The glob approach gives us the same result without any of those.

**Alternative 4: Delegate to gray-matter for frontmatter parsing**
gray-matter is the Node ecosystem's standard frontmatter parser. We don't need it — mdsvex already parses the YAML during compilation and exposes it as the module's `metadata` export. Adding gray-matter would be redundant; our loader consumes what mdsvex already produces.

**Alternative 5: Skip validation; trust the corpus**
"Just expose the data; if something's malformed, the user sees a weird page." No. A build-time failure is strictly better than a runtime surprise. Validation is 20 lines; the payoff is that a single bad frontmatter never reaches production.

The PE7 choice — synchronous eager glob + build-time validation + five small query functions — wins because it's simple, fast at request time, and fail-loud at build time.

## What could go wrong

**Symptom:** `pnpm build` fails with `[curriculum] /curriculum/.../lesson-NNN-xxx.md: missing "title"`
**Cause:** A lesson file's frontmatter is missing a required key. The loader's validation caught it.
**Fix:** Open the named file. Add the missing key. Rebuild.

**Symptom:** `[curriculum] duplicate number 031 in ... and ...`
**Cause:** Two lessons declare the same `number`. Usually a copy-paste mistake when authoring a new lesson.
**Fix:** Change one of the numbers. Also update the prev/next chain so the renumbered lesson's neighbors agree.

**Symptom:** `[curriculum] previous=30 does not resolve`
**Cause:** A lesson references a previous/next that doesn't exist yet. The chain has a dangling end.
**Fix:** Either set `previous: null` or `next: null` for lessons at the current ends, or add the missing target lesson.

**Symptom:** `import.meta.glob` returns an empty object at runtime
**Cause:** The glob pattern is wrong. Vite's glob is relative to the project root; paths must start with `/`.
**Fix:** The loader uses `'/curriculum/**/lesson-*.md'` — leading `/` means "repo root," NOT filesystem root. If you refactor the path, keep the leading `/`.

**Symptom:** Test 5 ("lesson 1 has no previous") fails after adding a new lesson 001
**Cause:** You inserted a new lesson before lesson 001 without updating the chain.
**Fix:** Lesson numbers are meant to be stable. Don't insert before 001. If structure genuinely changes, renumber the entire chain in a dedicated migration commit.

## Verify

```bash
# Loader file exists and is typed
ls src/lib/curriculum/index.ts
pnpm check
```
Expected: file exists; 0 errors.

```bash
# Test file exercises the loader
ls tests/curriculum.test.ts
```

```bash
# Full test run
docker compose up -d --wait
pnpm db:reset && pnpm db:seed
pnpm test
```
Expected:

```
Test Files  2 passed (2)
     Tests  8 passed (8)
```

```bash
# Build still clean
pnpm build
```

## Mistake log — things that went wrong the first time I did this

- **Used `import.meta.glob` without the leading `/`.** Wrote `import.meta.glob('../../../../curriculum/**/*.md')` — relative to the file, fragile, broke when I moved the loader. Switched to `/curriculum/...` (project-root absolute). Portable across refactors.
- **Put the loader in `src/lib/server/curriculum/`.** Blocked routes with universal load functions (`+page.ts`) from importing it — SvelteKit's build forbids importing server-only modules in universal code. Moved to `src/lib/curriculum/`. The loader doesn't read the filesystem at runtime, so it has no server dependency to hide.
- **Forgot the `asserts` return type on the validation function.** TypeScript refused to narrow `raw.metadata` to `LessonMeta` after the call; had to cast every access. Added `asserts meta is LessonMeta`, casts disappeared, the code reads cleanly.
- **Wrote eager-import-and-ignore-draft.** Drafts were still contributing to duplicate-slug / duplicate-number checks even though they didn't ship. Added `if (meta.draft === true) continue;` BEFORE the duplicate checks. Now draft lessons can share slugs with a WIP of their future-published-self without triggering validation errors.

## Commit this change

```bash
git add src/lib/curriculum/index.ts tests/curriculum.test.ts
git add curriculum/module-03-content-pipeline/lesson-031-build-loader.md
git commit -m "feat(curriculum): build the lesson loader + lesson 031"
```

Every future route — the lessons listing (lesson 032), the individual lesson page (lesson 033), the sidebar (lesson 036) — consumes these five query functions. The loader is the only module that understands filenames, globs, or frontmatter; everything downstream works against the typed surface.
