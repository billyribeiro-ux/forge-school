---
number: 13
slug: icon-generator
title: Build the SVG-to-Svelte icon generator
module: 1
moduleSlug: foundation
moduleTitle: Foundation
phase: 1
step: 13
previous: 12
next: 14
estimatedMinutes: 20
filesTouched:
  - package.json
  - pnpm-lock.yaml
  - scripts/generate-icons.ts
  - src/lib/icons/raw/forge-mark.svg
  - src/lib/icons/generated/ForgeMark.svelte
  - src/routes/+page.md
---

## Context

Iconify (lesson 012) covers 10,000+ general-purpose glyphs. It does not cover the **ForgeMark** — ForgeSchool's bespoke logo mark, the tiny visual signature that appears in the nav, favicon, email headers, and social cards. Bespoke marks need bespoke authoring. We design them as SVG files in `src/lib/icons/raw/`, run a generator that emits typed Svelte 5 components into `src/lib/icons/generated/`, and import the generated components anywhere in the app the same way we import any other component.

Crucially, the generator **emits Svelte 5 runes-mode code**, not Svelte 3 legacy. That disqualifies the popular `svg-to-svelte` package (last published for Svelte 3 compatibility); we write a small, typed Node script of our own (~100 lines) that reads SVGs, extracts the viewBox and inner elements, and emits a runes-mode component with `$props()` typing, accessibility-correct attributes, and `currentColor` defaults.

Generated components are **committed to the repo** — they are source, not build artifacts. The generator is rerun whenever a raw SVG is added or edited. Because Svelte's compiler catches syntax errors, a broken generator output would immediately fail `pnpm check`.

## The command

Install `tsx` — a zero-config TypeScript runner for Node. We use it to execute `scripts/generate-icons.ts` without a separate compile step:

```bash
pnpm add -D tsx
```

Create the directory structure:

```bash
mkdir -p src/lib/icons/raw src/lib/icons/generated scripts
```

Author the first raw SVG — `src/lib/icons/raw/forge-mark.svg`. Use `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, and path-only elements so color inherits and no hardcoded values leak through:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
     stroke="currentColor" stroke-width="1.75"
     stroke-linecap="round" stroke-linejoin="round">
  <path d="M4 16h16" />
  <path d="M6 16v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
  <path d="M9 10V7l2-2h2l2 2v3" />
  <path d="M3 20h18" />
</svg>
```

Author the generator at `scripts/generate-icons.ts`. The full file is ~100 lines of typed TypeScript. Key pieces:

```ts
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const RAW_DIR = join(ROOT, 'src/lib/icons/raw');
const OUT_DIR = join(ROOT, 'src/lib/icons/generated');

function toPascalCase(name: string): string {
  return name
    .split(/[-_\s]+/)
    .filter((segment): segment is string => segment.length > 0)
    .map((s) => s[0]!.toUpperCase() + s.slice(1).toLowerCase())
    .join('');
}

function parseSvg(source: string): { viewBox: string; inner: string } {
  // ...extract viewBox from the opening <svg> tag; return the inner content
}

function renderComponent({ viewBox, inner }: RawIcon): string {
  // ...emit a Svelte 5 runes component with $props(), SSR-safe attributes,
  // currentColor defaults, role/aria-label/aria-hidden logic driven by
  // the optional `title` prop.
}
```

Each generated component accepts three props:

- **`size?: number | string`** — CSS size, defaults to `'1em'` so it scales with the parent's `font-size`
- **`class?: string`** — additional classes merged onto the SVG root; named `class` but aliased to `extraClass` locally because `class` is a reserved JS keyword
- **`title?: string`** — accessible title for screen readers. When present, the SVG emits `role="img"` + `aria-label={title}` + a `<title>` child. When absent, the SVG emits `role="presentation"` + `aria-hidden="true"` — treating the icon as decoration.

Add a pnpm script to run the generator:

```diff
 "scripts": {
   "preinstall": "npx -y only-allow pnpm",
   "dev": "vite dev",
   ...
-  "check:watch": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch"
+  "check:watch": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch",
+  "icons:generate": "tsx scripts/generate-icons.ts"
 },
```

Run the generator:

```bash
pnpm icons:generate
```

Expected output:

```
[generate-icons] forge-mark.svg -> ForgeMark.svelte
[generate-icons] wrote 1 component(s) to /Users/.../src/lib/icons/generated
```

Verify the generated component is valid Svelte 5:

```bash
pnpm check
```

Expected: 0 errors.

Prove the pipeline works end-to-end by importing and rendering `ForgeMark` in the smoke-test homepage alongside the Iconify icons. Update `src/routes/+page.md`:

```diff
 <script lang="ts">
 	import Icon from '@iconify/svelte';
+	import ForgeMark from '$lib/icons/generated/ForgeMark.svelte';
 </script>

 <p aria-label="ForgeSchool iconography smoke test" style="...">
+	<ForgeMark />
 	<Icon icon="ph:lightning-bold" aria-hidden="true" />
 	<Icon icon="carbon:code" aria-hidden="true" />
 </p>
```

Both icon systems (Iconify for off-the-shelf, generated for bespoke) now render side by side. Each inherits `currentColor` from the parent `<p>`, each scales with the parent's `font-size`.

## Why we chose this — the PE7 judgment

**Alternative 1: Use the `svg-to-svelte` npm package**
The obvious candidate — it's in the PROMPT.md stack spec. But the latest version (2.2.1) depends on `svelte@^3.32.1` and emits Svelte 3 legacy syntax (`export let`). Converting Svelte 3 output to Svelte 5 runes inside the generator would require either an AST transformation (complex, fragile) or a post-generation string replace (yuck). Writing a small Node script that emits the correct Svelte 5 from scratch is 100 lines of typed, understood code. In exchange for dropping the dependency, we gain direct control of the output shape, prop API, and accessibility attributes — all three matter.

**Alternative 2: SVGR with a Svelte template**
SVGR is the React-ecosystem gold standard for SVG-to-component conversion. It has excellent customization via templates. Using SVGR for Svelte requires either a custom template (which is ~50 lines of JSX template syntax embedded in a config file) or a React→Svelte shim. Both are indirect. A direct Svelte generator is fewer moving parts.

**Alternative 3: Inline raw SVGs in each component that needs them**
The "no generator" approach: paste the SVG directly into each Svelte file that uses it. Works for one-off use. For an icon that appears in 12 places (nav, dropdown menu, favicon, email header, social card, etc.), we'd have 12 copies drift out of sync when the designer updates the mark. A generated component is a single source of truth — 12 imports, one file.

**Alternative 4: Use `<img src="/icons/forge-mark.svg">`**
Trivially simple, but forfeits every PE7 advantage: no `currentColor` (the image is a raster'd SVG, color is baked in), no accessibility props (title, role), no typed size prop, an extra HTTP request per icon instance. Inline SVG wins on every axis.

**Alternative 5: Write SVGs directly as `.svelte` files in `src/lib/icons/` without a generator**
Skip the generator; author `.svelte` files by hand. Acceptable for 3-5 bespoke marks. Break-even with a generator is somewhere around 5-10 icons — at that point, the per-icon boilerplate (`<script>` block, prop typing, accessibility attributes) becomes copy-paste drift. A generator amortizes the boilerplate. And for ForgeSchool specifically, we'll accumulate bespoke icons as we build module badges, completion markers, and instructor photos; the generator earns its seat within the first 10.

The PE7 choice — a ~100-line typed generator emitting Svelte 5 runes components — wins because it's self-contained, dependency-free beyond `tsx`, emits correct-for-this-stack output, and enforces a consistent icon API across every generated glyph.

## What could go wrong

**Symptom:** `pnpm icons:generate` errors with `Missing viewBox attribute on <svg>`
**Cause:** The raw SVG doesn't declare a `viewBox`. Many design tools export SVGs with `width` and `height` but no `viewBox`, which breaks scaling.
**Fix:** Add `viewBox="0 0 W H"` to the opening `<svg>` tag where W × H matches the design canvas. Use 24×24 for icons authored to the standard icon grid; 32×32 for slightly more detailed marks.

**Symptom:** Generated component renders a colored fill instead of inheriting `currentColor`
**Cause:** The raw SVG has a hard `fill="#000"` or `stroke="#333"` attribute on its path elements. The generator does not rewrite color attributes — that's a deliberate PE7 choice (if the source is wrong, fix the source).
**Fix:** Edit the raw SVG: replace `fill="#xxx"` with `fill="currentColor"` or remove the fill entirely if `stroke` is the intended style. Rerun `pnpm icons:generate`.

**Symptom:** Generated component fails `pnpm check` with `'class' is a reserved word`
**Cause:** Destructuring `$props()` with a key literally named `class` conflicts with JavaScript reserved words.
**Fix:** The generator aliases `class` to `extraClass` via destructuring: `let { class: extraClass } = $props()`. The component accepts `class="foo"` from callers, but the local binding is `extraClass`. If you hand-edit a generated component and reintroduce a bare `class:` key, this breaks.

**Symptom:** Icon appears enormous when used inside a button or small UI chrome
**Cause:** The parent's `font-size` is inherited from `body`, which is `--font-size-base` (16-18px). When the parent is a small button, its font-size may be smaller (e.g., `--font-size-sm`), but if the icon's parent is the button's inner `<span>` which inherits from the button's label text, the size follows. If the icon's direct parent has no font-size declared, it inherits from the button — which usually works.
**Fix:** Pass an explicit `size={14}` prop when the context needs it, or wrap the icon in a `<span style="font-size: var(--font-size-sm);">` ancestor.

## Verify

```bash
# Generator script exists and has the expected entry point
ls scripts/generate-icons.ts
grep 'await main' scripts/generate-icons.ts
```

Expected: file exists and `await main()` is the last expression.

```bash
# Raw and generated directories exist
ls src/lib/icons/raw/ src/lib/icons/generated/
```

Expected: `raw/` has at least one `.svg`; `generated/` has at least one `.svelte`.

```bash
# The icons:generate script is registered in package.json
grep '"icons:generate"' package.json
```

Expected: a line referencing `tsx scripts/generate-icons.ts`.

```bash
pnpm icons:generate
```

Expected: one log line per SVG processed, plus a summary count.

```bash
pnpm check
pnpm build
```

Expected: 0 errors.

**Live-browser check:** Open `pnpm dev`. The home page now shows three icons in a row — the ForgeMark followed by the two Iconify icons — all rendering in the brand color and scaling with the fluid type scale.

## Mistake log — things that went wrong the first time I did this

- **Tried to use the `svg-to-svelte` npm package per the PROMPT.md stack.** Installed it, inspected the emitted output, found `export let size = '1em'` — Svelte 3 legacy syntax, incompatible with our runes-only forced compiler mode. Uninstalled and wrote the generator from scratch. Cost: ~30 minutes. Value: generator output is correct for Svelte 5, no legacy baggage, and the generator is readable in full at ~100 lines.
- **Forgot the `--experimental-strip-types` node flag before adding `tsx`.** Tried `node scripts/generate-icons.ts` first — Node refused to run TypeScript. Added `tsx` as a devDep and used that. Considered using Node 22's native `--experimental-strip-types`, decided against because `tsx` handles paths, ESM interop, and other edge cases that bare strip-types doesn't.
- **Wrote `await mkdir(OUT_DIR)` without `recursive: true`.** First run failed with `EEXIST` when `OUT_DIR` already existed. Added `{ recursive: true }` — the standard idiom — and the script became re-runnable.
- **Script wrote `class={class}` in the emitted template.** Svelte compiler flagged it as a reserved-word syntax error. Aliased to `extraClass` via destructuring in the emitted script block. The component's public prop API stays `class`; only the internal binding is renamed.

## Commit this change

```bash
git add package.json pnpm-lock.yaml scripts/generate-icons.ts \
       src/lib/icons/raw/forge-mark.svg \
       src/lib/icons/generated/ForgeMark.svelte \
       src/routes/+page.md
git add curriculum/module-01-foundation/lesson-013-icon-generator.md
git commit -m "feat(icons): add svg-to-svelte generator + ForgeMark + lesson 013"
```

With both icon systems wired — Iconify for the generic library, our generator for bespoke marks — the iconography story is complete. Lesson 014 turns to dev-time tooling: Svelte Agentation, a source-aware inspector that helps us navigate from a rendered element back to the source file that produced it.
