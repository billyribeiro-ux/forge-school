---
number: 34
commit: d2c73b729a43796875eae62498076ad3d9a36af3
slug: shiki-syntax-highlighting
title: Render Markdown code blocks with shiki
module: 3
moduleSlug: content-pipeline
moduleTitle: Content Pipeline
phase: 3
step: 6
previous: 33
next: 35
estimatedMinutes: 15
filesTouched:
  - package.json
  - pnpm-lock.yaml
  - svelte.config.js
---

## Context

Lesson 032 installed a minimal `plainHighlighter` that escaped code blocks to survive mdsvex's template-literal wrapping — black-and-white `<pre><code>` output, no colors. This lesson swaps it for **shiki**, the VS Code-grade syntax highlighter that powers Astro, VitePress, Next.js Docs, and Prettier's playground in 2026. Shiki produces per-token inline styles using real TextMate grammars — the same ones VS Code ships — so a Bash block in ForgeSchool renders exactly as it would in the editor where the code was authored.

Shiki runs **at build time** through the mdsvex `highlight` hook. The runtime bundle ships the HTML with inline styles baked in; no shiki JavaScript reaches the browser. Cold build adds ~1 second; every lesson renders with proper syntax color.

Dual-theme (light + dark) without JS: shiki emits every token with two inline color properties behind a `--shiki-light` / `--shiki-dark` CSS variable pair, switched by the color-scheme cascade. Students on dark-mode OS see a dark theme automatically; the future `[data-theme]` toggle from lesson 008's tokens.css flips themes without reloading.

## The command

Install shiki:

```bash
pnpm add -D shiki
```

Replace `plainHighlighter` in `svelte.config.js` with a shiki-backed implementation. Top-level `await` initializes the highlighter once for the full build:

```js
import { createHighlighter } from 'shiki';

const shiki = await createHighlighter({
  themes: ['github-light', 'github-dark'],
  langs: [
    'bash', 'css', 'diff', 'html', 'javascript', 'json',
    'markdown', 'shell', 'sql', 'svelte', 'typescript', 'yaml'
  ]
});

function shikiHighlighter(code, lang) {
  const resolved = lang && shiki.getLoadedLanguages().includes(lang) ? lang : 'text';
  const html = shiki.codeToHtml(code, {
    lang: resolved,
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false
  });
  return escapeSvelte(html);
}
```

And wire it into the mdsvex options:

```diff
 highlight: {
-  highlighter: plainHighlighter
+  highlighter: shikiHighlighter
 }
```

Three design choices worth calling out:

1. **Preloaded language list.** Shiki supports 200+ languages; loading all of them would be wasteful. The twelve we preload cover every fenced block every current lesson uses plus the languages we're likely to author in (sql for lesson 047+, diff for migration recaps). Adding a new language is a one-line edit.
2. **`defaultColor: false`** — shiki emits `--shiki-light` and `--shiki-dark` CSS variables per token. Without `defaultColor: false`, it also bakes one of the two as the default color, defeating the dual-theme purpose.
3. **`escapeSvelte(html)`** — shiki's output is syntactically-correct HTML, but the mdsvex template-literal wrapping still applies. `escapeSvelte` from mdsvex handles backtick + $ escaping so `$variable` in a bash block survives.

Verify:

```bash
pnpm build
```
Expected: clean build. The `curriculum` chunk grows by ~450KB (mostly inline styles for tokens) but gzip stays reasonable. Module 7's optimization phase addresses the chunk-size question if it becomes a real problem.

Open `pnpm dev` and view any lesson. Code blocks now render with light-theme syntax colors. Toggle OS dark mode — the same page now shows dark-theme colors (no reload needed; the `--shiki-*` vars switch via the color-scheme cascade).

## Why we chose this — the PE7 judgment

**Alternative 1: Keep Prism**
mdsvex's default Prism is older than shiki, simpler to configure, and emits class-based HTML (not inline styles). Two problems: Prism's grammars are hand-rolled and drift from editor reality, and Prism ships a runtime JS payload to the browser. Shiki's build-time model means zero runtime cost for highlighting and VS Code-matching token granularity.

**Alternative 2: highlight.js**
highlight.js is another popular choice. Similar concerns to Prism — older grammars, runtime-heavy. Shiki is strictly better for a 10-year project.

**Alternative 3: Client-side shiki**
Shiki can run in the browser too. We don't — the curriculum is a build-time constant, highlighting at build-time means the HTML is cacheable at CDN edge with no re-highlighting needed. Runtime shiki would add ~500KB of grammar data to the client bundle.

**Alternative 4: Skip dual-theme; pick one**
Simpler, smaller output. Also worse UX on dark-mode displays where a bright light-theme pre looks harsh. The dual-theme CSS variable approach costs ~1.2× the HTML size and handles every theme scenario automatically.

The PE7 choice — shiki at build-time, dual-theme via CSS variables, twelve preloaded languages — wins because it produces editor-grade highlighting with zero runtime cost and automatic light/dark.

## What could go wrong

**Symptom:** `pnpm build` hangs on the shiki import line
**Cause:** Top-level await in `svelte.config.js` on a Node that rejects it, or a circular import.
**Fix:** Node 22.11+ (our engine floor) supports top-level await in ESM. Confirm `type: "module"` in `package.json` (we set this in lesson 003).

**Symptom:** A fenced block with language tag `ts` renders as plain text
**Cause:** shiki calls it `typescript`, not `ts`. Our code checks `getLoadedLanguages()` which includes both aliases.
**Fix:** Confirm your fence uses one of the registered langs. If a lesson needs a language not in the preload list, add it to the `langs` array.

**Symptom:** Code blocks render in one theme only, no dark toggle
**Cause:** `defaultColor: false` is missing from the `codeToHtml` options.
**Fix:** Add `defaultColor: false`. Without it, shiki bakes one theme as the default; with it, both themes are emitted as CSS variables.

**Symptom:** Bundle size alert on the curriculum chunk
**Cause:** Shiki emits per-token inline styles; accumulated across 30+ lessons that's a lot of markup.
**Fix:** Module 7's optimization phase uses a `class-based` shiki transformer that emits class names referencing a single inlined theme CSS. Defer until there's a real problem.

## Verify

```bash
pnpm build
```
Expected: build succeeds; `curriculum` chunk in the multi-hundred-KB range.

```bash
# Shiki dependency installed
grep '"shiki"' package.json
```

Open a lesson that contains bash and TypeScript fences (any lesson in the current curriculum). Confirm:
- Comments render in muted color
- String literals in one color (different from identifiers)
- Keywords in a third color
- Toggle OS dark mode → colors invert with theme

## Mistake log — things that went wrong the first time I did this

- **Used the legacy `getHighlighter()` instead of `createHighlighter()`.** Shiki 2+ renamed the factory. `getHighlighter` still works with a deprecation warning; `createHighlighter` is the supported form.
- **Pre-loaded every single language shiki supports.** Build time jumped from 1s to 40s. Trimmed to the dozen we actually use. Build back to ~1.5s.
- **Forgot to wrap the shiki output in `escapeSvelte`.** Bash blocks with `$VAR` blew up at runtime — same template-literal trap we hit with the plain highlighter. Wrapped the shiki output through `escapeSvelte`; problem solved.
- **Left `defaultColor: true` (the default).** Dark mode showed light-theme colors. The output had inline `color: #...` baked in, overriding the CSS-variable cascade. Setting `defaultColor: false` made shiki emit both themes as vars; the cascade does the rest.

## Commit this change

```bash
git add package.json pnpm-lock.yaml svelte.config.js
git add curriculum/module-03-content-pipeline/lesson-034-shiki-syntax-highlighting.md
git commit -m "feat(content): wire shiki for syntax highlighting + lesson 034"
```

Every code block in every lesson now renders with VS Code-grade colors, both light and dark. Lesson 035 adds prev/next navigation between lessons so students can read straight through the curriculum without returning to the listing.
