# Lesson 014 — Wire Svelte Agentation for dev-time source inspection

**Module:** 1 — Foundation
**Phase:** PE7 Build Order → Phase 1, Step 14
**Previous lesson:** 013 — Build the SVG-to-Svelte icon generator
**Next lesson:** 015 — Scaffold `hooks.server.ts` with pino logger + error handler
**Estimated time:** 5 minutes
**Files touched:** `svelte.config.js`

---

## Context

Every serious frontend engineer has, at some point, hovered over a rendered button and asked: *"which file in this 400-file codebase produced this?"* In a large SvelteKit app with 80 components composed across 12 layouts and 30 routes, the answer is rarely obvious from source-code scanning. The cost of looking it up manually — grepping for class names, following prop drilling, reading through conditional rendering — adds friction to every bug report, every design review, every design-system audit.

**Svelte Agentation** is our name for the dev-mode, source-aware inspector that ships built-in with `@sveltejs/vite-plugin-svelte`. Enabled, a keyboard combo overlays every hovered element with a tooltip showing the exact file path and line number that produced it. Click, and the file opens in your editor at that line. Disabled, the code does not ship — the vite-plugin-svelte build pipeline strips the inspector entirely from production output.

The inspector is a production-grade tool masquerading as a small convenience. It is how a senior engineer navigates an unfamiliar codebase in seconds; how a designer looking at a broken button finds the file to file the issue against; how a code-review participant cross-references a screenshot to source.

This lesson adds five lines to `svelte.config.js`. The payoff compounds across the entire project lifecycle.

## The command

Edit `svelte.config.js`. Add a `vitePlugin.inspector` block at the top level of the config:

```diff
 const config = {
 	extensions: ['.svelte', '.md', '.svx'],
 	preprocess: [mdsvex(mdsvexOptions)],
 	compilerOptions: {
 		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
 	},
+	// Svelte Agentation — dev-mode, source-aware element inspector.
+	// Press Control+Shift to toggle; hover an element to highlight it; click to
+	// open the source file + line in your editor. Tree-shaken from production
+	// builds by vite-plugin-svelte, so the inspector code never ships to users.
+	vitePlugin: {
+		inspector: {
+			toggleKeyCombo: 'control-shift',
+			holdMode: true,
+			showToggleButton: 'active',
+			toggleButtonPos: 'bottom-right'
+		}
+	},
 	kit: { adapter: adapter() }
 };
```

**What each option does:**

- **`toggleKeyCombo: 'control-shift'`** — hold Control+Shift to activate. No alphabetic keys (which would conflict with typing into input fields). Modifier-only is the PE7-correct choice.
- **`holdMode: true`** — inspector is active only while the combo is held. Release the keys, the overlay disappears. No sticky-state confusion. The alternative (toggle-on, toggle-off) leaves the inspector latched in unpredictable states after tab-switches.
- **`showToggleButton: 'active'`** — a small inspector-button appears in the corner only when the inspector is engaged, as a visual confirmation of state. Set to `'always'` if you want a persistent affordance; set to `'never'` if you dislike corner chrome during dev.
- **`toggleButtonPos: 'bottom-right'`** — out of the way of the typical screen-reader landmark region (top-left) and out of the typical "submit button" zone (bottom-center).

Verify the dev server picks it up:

```bash
pnpm dev
```

Navigate to the home page. Press and hold **Control+Shift**. A colored overlay appears around the element under your cursor. Click — your editor opens to the source file and line.

Verify the inspector is **not** in the production bundle:

```bash
pnpm build
grep -rE "vite-plugin-svelte-inspector|svelte-inspector" .svelte-kit/output/client/ 2>&1 | head -5
```

Expected: no matches. The inspector code is compiled out when `NODE_ENV=production`.

## Why we chose this — the PE7 judgment

**Alternative 1: Use the Svelte DevTools browser extension**
The Svelte DevTools browser extension shows component trees and reactive state in a dev panel. Excellent for inspecting runtime state. It does not give you the source-to-rendered-element mapping — you still have to find the source file yourself. The vite-plugin inspector complements DevTools; it does not replace it. For the workflow this lesson optimizes (element → source), the inspector is strictly better.

**Alternative 2: VS Code's Svelte extension + manual "Go to Definition"**
Works when you already know the component name. Doesn't help when all you have is a rendered button and no idea what component produced it. The inspector fills this specific gap.

**Alternative 3: Build a custom dev-mode inspector from scratch**
Possible — a Svelte action that attaches click listeners and opens editor links via the `vscode://file/...` protocol. The vite-plugin-svelte inspector does all of this already, with 3 years of polish, accessibility support (keyboard navigation), and the tree-shaking integration we need. Building a custom one is a 3-day project with no upside.

**Alternative 4: Disable the inspector entirely**
Defensible on a team of one where you know every file by memory. Indefensible the moment a second engineer joins the project, or when a designer wants to file bugs against specific files, or when a code review pulls up a screenshot and asks "where is this?" Five lines of config for a lifetime of answering that question in seconds.

The PE7 choice — opt-in, hold-mode inspector, tree-shaken from prod — wins because it adds zero runtime cost in production and reduces the cost of navigating the codebase in dev by an order of magnitude.

## What could go wrong

**Symptom:** Pressing Control+Shift opens nothing — the inspector does not activate
**Cause:** The dev server hasn't been restarted since the config change, or the config is loaded in a state where `inspector` is ignored.
**Fix:** Stop the dev server (Ctrl+C), confirm `svelte.config.js` has the `vitePlugin.inspector` block, restart with `pnpm dev`. If still broken, check the dev server logs for a vite-plugin-svelte warning about the config.

**Symptom:** Clicking a highlighted element opens a browser search for the file path instead of the editor
**Cause:** The `vscode://` URL protocol isn't registered for your editor, or you're using a different editor entirely (IntelliJ, Zed, Sublime).
**Fix:** Each editor has its own protocol — `vscode://`, `webstorm://`, `zed://`. The inspector uses `vscode://` by default but the underlying source map resolves to a file path. Install the editor-specific URL-handler extension, or configure your OS to route the URL to your editor. On macOS: open a terminal, run `open vscode://file/...` — if that fails, VS Code isn't registered.

**Symptom:** Inspector works but the highlighted elements don't correspond to Svelte components — everything is `<body>` or `<div>` level
**Cause:** The inspector highlights the Svelte component that produced each rendered DOM element. In a layout-heavy route, many elements are produced by the root `+layout.svelte`, which is correct — they *are* from the layout.
**Fix:** Use the arrow keys (configured via `navKeys`) to navigate the component tree. `ArrowUp` moves to the parent component, `ArrowDown` to a child. This gives granularity the mouse-based flow doesn't.

**Symptom:** Production build still seems to include inspector code (file size too large)
**Cause:** A stale `.svelte-kit/` output directory from a dev build, not a fresh production build.
**Fix:** `rm -rf .svelte-kit build && pnpm build`. The fresh production build will not include inspector code — confirmed by grepping the output as shown in Verify.

## Verify

```bash
# The config block is present
grep -A8 "inspector:" svelte.config.js
```

Expected: the `toggleKeyCombo`, `holdMode`, `showToggleButton`, `toggleButtonPos` lines.

```bash
# Dev-mode smoke test
pnpm dev
```

Open the home page. Press and hold Control+Shift. Hover a rendered element. An overlay appears with the file path (`src/routes/+page.md`) and a line number. Click — your editor opens.

```bash
# Production bundle does not include inspector
pnpm build
grep -rE "vite-plugin-svelte-inspector|svelte-inspector" .svelte-kit/output/client/ 2>&1 | wc -l
```

Expected: `0`.

```bash
pnpm check
```

Expected: 0 errors.

## Mistake log — things that went wrong the first time I did this

- **Placed the `inspector` block under `kit` instead of at the top level of the config.** `kit` is for SvelteKit-specific config (adapter, paths, alias, csrf). The vite-plugin-svelte `vitePlugin` key is a sibling, not a child, of `kit`. The inspector options live under `vitePlugin.inspector`. Moved it to the correct place; inspector activated.
- **Chose `toggleKeyCombo: 'alt-x'` (the default).** Caused a Firefox shortcut conflict — alt-x on some OS configs focuses the View menu. Switched to `control-shift` (a modifier-only combo) which has no native browser binding.
- **Enabled `showToggleButton: 'always'`.** A little inspector button appeared in the bottom-right on every dev page load, including routes where I didn't want it. Changed to `'active'` — the button appears only when the inspector is engaged, matching the hold-mode UX.
- **Forgot that the inspector needs the file to be mapped to its source path.** Worked when I ran `pnpm dev` locally. Didn't work when a teammate cloned the repo and tried it — because their clone was in `/Users/teammate/...` but the source maps had my path. Turned out to be fine: the source maps rebuild on every dev server start, so teammate's dev worked from their paths. The mistake was mine for worrying about it.

## Commit this change

```bash
git add svelte.config.js
git add curriculum/module-01-foundation/lesson-014-svelte-agentation.md
git commit -m "feat(dev): wire Svelte Agentation inspector + lesson 014"
```

With source-to-DOM navigation live in dev, every future lesson where we add or modify components has a much lower friction for finding existing code. Lesson 015 adds the server-side tool of the same shape: `hooks.server.ts` with structured logging via pino, so every request produces a trace we can follow from error back to root cause.
