---
number: 7
commit: 1d81d1d946c2d7b2933e999231feb36f4adb53ae
slug: install-mdsvex
title: Install mdsvex and wire Markdown rendering
module: 1
moduleSlug: foundation
moduleTitle: Foundation
phase: 1
step: 7
previous: 6
next: 8
estimatedMinutes: 10
filesTouched:
  - package.json
  - pnpm-lock.yaml
  - svelte.config.js
  - src/routes/+page.svelte
  - src/routes/+page.md
---

## Context

ForgeSchool's entire curriculum is Markdown. 170 lessons live as `.md` files under `curriculum/`. To serve any of them from the SvelteKit app, the build pipeline has to understand `.md` as a component format — not a static file to `fetch()` and parse at request time, but a source file that Vite compiles into a Svelte component. The Markdown becomes the component's template. Frontmatter becomes component metadata. Svelte tags inside the Markdown become real Svelte — so a lesson can embed an interactive component next to its prose.

`mdsvex` is the preprocessor that makes this work. It sits in the Svelte compile chain: file → mdsvex converts Markdown + frontmatter → standard Svelte source → Svelte compiler → JS module. The result is that `curriculum/lesson-001.md` is indistinguishable at the component level from `src/routes/+page.svelte` — both produce a Svelte component function.

We wire it now, in Module 1, even though we won't use it for lessons until Module 3. Two reasons: first, getting the preprocessor chain right early means every subsequent `.svelte` file in the repo is compiled through the same pipeline; second, we want to prove it works with a minimal smoke test before there's any real content to debug against. If the home page renders from `+page.md`, mdsvex is live.

## The command

Install mdsvex as a dev dependency:

```bash
pnpm add -D mdsvex
```

Edit `svelte.config.js` to register mdsvex as a preprocessor and extend the recognized extensions:

```diff
 import adapter from '@sveltejs/adapter-auto';
+import { mdsvex } from 'mdsvex';
+
+/** @type {import('mdsvex').MdsvexOptions} */
+const mdsvexOptions = {
+  extensions: ['.md', '.svx'],
+  smartypants: {
+    dashes: 'oldschool'
+  }
+};

 /** @type {import('@sveltejs/kit').Config} */
 const config = {
+  extensions: ['.svelte', '.md', '.svx'],
+  preprocess: [mdsvex(mdsvexOptions)],
   compilerOptions: {
     runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
   },
   kit: {
     adapter: adapter()
   }
 };
```

Two config keys do the work. **`extensions`** (top-level, read by SvelteKit itself) tells the framework which file extensions to treat as route modules. Without it, SvelteKit only recognizes `.svelte` — a `+page.md` would be invisible. **`preprocess`** (also top-level, Svelte-level) runs the mdsvex transformer on any file in the compile chain. The two must agree on the set of extensions; we list `.md` and `.svx` in both.

`smartypants.dashes: 'oldschool'` converts `--` to en-dash and `---` to em-dash — the typographic move that distinguishes "written by a human who cares" from "pasted from a code editor." We'll layer in more typographic polish in Module 3 when we build the lesson renderer proper. For now, oldschool dashes are the one affordance we turn on because our prose already uses `—` liberally.

Prove the pipeline by converting the home page from Svelte to Markdown. Delete `src/routes/+page.svelte`:

```bash
rm src/routes/+page.svelte
```

Create `src/routes/+page.md`:

```markdown
# Welcome to ForgeSchool

This is a smoke test for the [mdsvex](https://mdsvex.pngwn.io/) pipeline — a Markdown file compiled as a Svelte component and served as a route.

Visit [svelte.dev/docs/kit](https://svelte.dev/docs/kit) to read the SvelteKit documentation.
```

Verify the build:

```bash
pnpm check
pnpm build
```

Expected: `0 ERRORS 0 WARNINGS` from check, and a successful build with a `_page.md.js` chunk visible in the server output. That `.md.js` filename is the proof — Vite saw a `.md` file, mdsvex converted it, Svelte compiled the result, and Rollup emitted a JS module named after the source.

## Why we chose this — the PE7 judgment

**Alternative 1: Render Markdown at request time with `marked` or `markdown-it`**
This is the "dumb" approach: store lesson files on disk, read them in a `+page.server.ts` load function, run the Markdown through a runtime parser, inject the resulting HTML via `{@html}`. It works. It also gives up every Svelte affordance — you cannot embed a Svelte component inside a lesson, you cannot use runes, you cannot apply scoped CSS. The whole point of a course *about* Svelte is that the course content *uses* Svelte. Runtime Markdown rendering forfeits that.

**Alternative 2: Pre-render Markdown to HTML at build time with a separate script**
A `scripts/build-curriculum.ts` that walks `curriculum/` and emits `.html` files into `static/`. This works but fragments the pipeline: two build steps, two source-of-truth file trees, no shared TypeScript config, no HMR during lesson authoring, no type-safe frontmatter. The mdsvex path keeps everything in Vite, which means a `.md` edit live-reloads in dev just like a `.svelte` edit.

**Alternative 3: Use MDX (the React-ecosystem equivalent)**
MDX is excellent — in a React codebase. In SvelteKit, mdsvex is the native equivalent. Using MDX would require running Babel or an MDX-to-Svelte bridge, and the bridge fights every Svelte-specific feature (runes, `{@attach}`, `{#snippet}`). mdsvex is Svelte-native; MDX is React-native. Match the tool to the stack.

**Alternative 4: Use `vite-plugin-markdown` or a homegrown Vite plugin**
A raw Vite plugin gets you "Markdown as a module" but doesn't run the content through the Svelte compiler. Your lesson's frontmatter becomes a JS object, but the body is just an HTML string — again, no `<Counter />` inside a lesson, no scoped CSS, no reactivity. mdsvex inherits *everything* Svelte does, because the output of mdsvex is a Svelte component.

The PE7 choice — mdsvex — wins because the curriculum can be Svelte-native. The lesson on `$state` will embed a live runes demo. The lesson on Motion animations will demo the animation inline. The lesson authoring surface gets stronger as Svelte does.

## What could go wrong

**Symptom:** `pnpm build` fails with `Cannot find module 'mdsvex'`
**Cause:** The install didn't complete, or `svelte.config.js` was edited before `pnpm add -D mdsvex` finished.
**Fix:** Re-run `pnpm add -D mdsvex`. Confirm `mdsvex` appears in `package.json` devDependencies and in `pnpm-lock.yaml`.

**Symptom:** `+page.md` is served as a 404 or a raw Markdown file download
**Cause:** `extensions` in `svelte.config.js` is missing `.md`, so SvelteKit doesn't recognize the file as a route module. The Svelte compiler still sees it (because preprocess is wired), but the router skips it.
**Fix:** Both the top-level `extensions` and the mdsvex `extensions` must include `.md`. They are two different keys read by two different parts of the framework.

**Symptom:** `+page.md` renders but Svelte tags inside it (`<script>`, `{variable}`, `<svelte:head>`) are treated as literal text
**Cause:** mdsvex's default behavior is to treat Markdown as the primary syntax and allow Svelte as embedded escape hatches. If your content's first non-whitespace content is a Markdown heading or paragraph, Svelte blocks mid-document work; if it's something weird, the mdsvex parser may fall back to literal-text mode.
**Fix:** Put a `<script>` block above your content if you need reactive state in the page. Markdown content always lives in the body, Svelte tags live in `<script>` or as inline elements. The mdsvex docs at [mdsvex.pngwn.io](https://mdsvex.pngwn.io/) show the complete grammar.

**Symptom:** `svelte-check` reports `Cannot find module '$lib/...'` errors only in `.md` files
**Cause:** `svelte-kit sync` didn't regenerate `.svelte-kit/tsconfig.json` after the extensions changed.
**Fix:** `pnpm exec svelte-kit sync`. Our `check` script does this automatically, but if you invoke `svelte-check` directly you must sync first.

## Verify

```bash
# mdsvex is installed at the expected version range
grep '"mdsvex"' package.json
```

Expected: a line like `"mdsvex": "^0.12.7"` in devDependencies.

```bash
# svelte.config.js wires mdsvex as a preprocessor
grep -E "mdsvex|preprocess|extensions" svelte.config.js
```

Expected: multiple matches showing the import, the mdsvexOptions, the top-level extensions array, and the preprocess array.

```bash
# The smoke-test home page is now Markdown
ls src/routes/+page.*
```

Expected: `src/routes/+page.md` exists, `src/routes/+page.svelte` does not.

```bash
# Full check + build pass
pnpm check
pnpm build
```

Expected: check reports `0 ERRORS 0 WARNINGS`; build emits a `_page.md.js` chunk.

## Mistake log — things that went wrong the first time I did this

- **Set `extensions` inside `mdsvex()` only.** Didn't also set the top-level `extensions` on the SvelteKit config object. Result: `.md` files compiled fine but SvelteKit didn't recognize them as routes. `+page.md` 404'd. The two `extensions` keys are read by two layers — mdsvex's own registration, and SvelteKit's route discovery. Both must agree.
- **Named the preprocessor options variable `options` (generic).** When I later added a second preprocessor (wouldn't happen in this lesson, but happened in a prototype), the two `options` variables collided. Renamed to `mdsvexOptions` so the preprocessor chain is legible when it grows.
- **Left a mix of `.md` and `.svelte` for the same route path.** SvelteKit's router sees them both and fails with `duplicate route` at dev-server start. The fix is to delete the old `.svelte` when converting to `.md`. A route has exactly one source file, regardless of extension.
- **Tried to use mdsvex layouts before understanding the frontmatter convention.** Layouts wrap every `.md` file automatically — but I wanted per-lesson layouts for lesson pages only, not for `+page.md`. Left layouts unconfigured in this lesson. Will revisit in Module 3 when the lesson renderer is built.

## Commit this change

```bash
git add package.json pnpm-lock.yaml svelte.config.js src/routes/+page.md
git rm src/routes/+page.svelte
git add curriculum/module-01-foundation/lesson-007-install-mdsvex.md
git commit -m "feat(mdsvex): install and wire Markdown preprocessing + lesson 007"
```

With mdsvex in the pipeline, the repo can now compile `.md` files as first-class Svelte components. Module 3 will exploit this to load every lesson under `curriculum/` through a single typed API. Lesson 008 shifts to the CSS foundation — the OKLCH color tokens that every component in the repo will reference.
