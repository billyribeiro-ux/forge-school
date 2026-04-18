---
number: 11
commit: 1d81d1d946c2d7b2933e999231feb36f4adb53ae
slug: layer-cascade
title: Set up the @layer cascade
module: 1
moduleSlug: foundation
moduleTitle: Foundation
phase: 1
step: 11
previous: 10
next: 12
estimatedMinutes: 15
filesTouched:
  - src/lib/styles/layers.css
  - src/lib/styles/reset.css
  - src/lib/styles/base.css
  - src/routes/+layout.svelte
---

## Context

CSS has had a silent problem since 1996: specificity wars. A component wants to override a base style; it adds a more-specific selector. The base style's author counter-increases specificity to win the cascade. A developer writes `!important` to terminate the debate. By the third round, the codebase is playing Calvinball and nobody remembers which rule is authoritative.

The `@layer` at-rule (CSS Cascade Layers Level 5, shipped to stable browsers in 2022) ends this. Layers declare a precedence order that is orthogonal to specificity: a rule in a later layer always beats a rule in an earlier layer, regardless of selector specificity. If `@layer base { .card { color: red } }` and `@layer components { .card.dark { color: white } }`, the component wins — not because `.card.dark` is more specific, but because the `components` layer outranks the `base` layer.

The layered cascade we establish here is the one every PE7-grade application converges on: **reset → tokens → base → components → utilities → overrides**. Every style in the codebase belongs to one of six named layers. Unlayered styles are forbidden outside a handful of narrow exceptions (`@font-face`, top-level `@keyframes`).

This lesson introduces three new style files — `layers.css` (the cascade order declaration), `reset.css` (modern minimal reset), `base.css` (element-level defaults referencing tokens) — and rewires the root layout's import order so the cascade is registered before any other stylesheet attaches.

## The command

Create `src/lib/styles/layers.css`. Its job is to declare the cascade order — nothing else. The declaration fixes the precedence for the whole app:

```css
@layer reset, tokens, base, components, utilities, overrides;
```

Below this single line, a long header comment documents the choice so a future reader understands why each layer is where it is.

Create `src/lib/styles/reset.css` with a modern minimal reset wrapped in `@layer reset`. Highlights:

- `box-sizing: border-box` universally (including `::before`/`::after`)
- `margin: 0` on every element — components opt in to spacing explicitly
- `html` / `body` set to 100% height so flex/grid root layouts behave predictably
- `font-smoothing` and `text-rendering` for high-DPI displays
- Block media (`img`, `picture`, `video`, `svg`) with `max-inline-size: 100%` — no overflow
- Form controls inherit typography rather than using UA sans-serif
- Headings reset to `font-size: inherit` so base layer decides sizes
- Anchors inherit color; base layer decides link styling
- A `prefers-reduced-motion: reduce` block that kills all animations at the reset level

Create `src/lib/styles/base.css` with element-level defaults wrapped in `@layer base`. This is where tokens meet HTML elements:

```css
@layer base {
  html {
    font-family: var(--font-sans);
    font-size: 100%;
    line-height: var(--line-height-normal);
    color: var(--color-fg);
    background: var(--color-bg);
  }
  body { font-size: var(--font-size-base); font-weight: var(--font-weight-regular); }
  h1 { font-size: var(--font-size-4xl); }
  h2 { font-size: var(--font-size-3xl); }
  h3 { font-size: var(--font-size-2xl); }
  /* ... through h6 */
  a { color: var(--color-link); text-decoration: underline; ... }
  code, kbd, samp, pre { font-family: var(--font-mono); }
  :focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }
  ::selection { background: var(--color-brand); color: var(--color-brand-fg); }
}
```

Wire the new files into the root layout. **Order matters:** `layers.css` imports first so the cascade declaration is registered before any layer-using stylesheet attaches:

```diff
 <script lang="ts">
 	import favicon from '$lib/assets/favicon.svg';
+	// Order matters: layers.css must import first so the @layer precedence
+	// is declared before any other stylesheet registers a layer.
+	import '$lib/styles/layers.css';
+	import '$lib/styles/reset.css';
 	import '$lib/styles/tokens.css';
 	import '$lib/styles/breakpoints.css';
 	import '$lib/styles/typography.css';
+	import '$lib/styles/base.css';

 	let { children } = $props();
 </script>
```

Verify:

```bash
pnpm check
pnpm build
```

Expected: 0 errors. Every rule authored from lesson 008 forward now lives inside a named layer, and the layer order is deterministic.

## Why we chose this — the PE7 judgment

**Alternative 1: Rely on source order and specificity (no layers)**
The traditional approach: write the reset first, then tokens, then base, then components — and trust that source order determines precedence. This works only as long as nobody needs to override a base style from a component, and nobody needs to trump a component style with a utility class. The moment override behavior is needed, the escalation begins: an engineer adds `!important`, another adds a higher-specificity selector, a third adds `!important` at yet higher specificity. Within six months the CSS is a Jenga tower. `@layer` prevents the escalation by giving precedence a name and a declared order.

**Alternative 2: Use BEM + strict specificity discipline instead of layers**
BEM (Block-Element-Modifier) naming keeps selectors at single-class specificity, which makes source order determine precedence reliably. This works — it is how many successful design systems were built before 2022. But it is a social contract, not a technical enforcement: a single engineer who reaches for an ID selector or a descendant combinator breaks the invariant for the whole codebase. Layers enforce at the browser level: no amount of clever selector-writing can make a `@layer base` rule beat a `@layer components` rule. The guarantee survives every contributor.

**Alternative 3: CSS-in-JS (Emotion, styled-components, vanilla-extract)**
CSS-in-JS generates unique class names per component, sidestepping specificity issues at the cost of a runtime (or build-time) JavaScript evaluation step. For a Svelte project, this is strictly worse than native scoped CSS inside `.svelte` files — Svelte already generates scoped class names at compile time, with zero runtime cost. We keep component styles inside `.svelte <style>` blocks and wrap them in `@layer components` via the Svelte compiler's emit. No CSS-in-JS library needed.

**Alternative 4: Use `@scope` instead of `@layer` for isolation**
`@scope` (CSS Nesting + Cascade Scoping Level 6) restricts a rule's applicability to a DOM subtree. It solves isolation; it does not solve precedence ordering between global rules. The two features are complementary, not alternatives. We use `@layer` for global precedence and rely on Svelte's scoped styles (which `@scope` is the standards-track equivalent of) for per-component isolation.

**Alternative 5: Skip the `base` layer — let components style every element**
Some design systems have components for every surface (`<Button>`, `<Link>`, `<Heading>`), and no bare `<h1>` or `<a>` ever renders in production. Defensible at scale. ForgeSchool renders Markdown content (mdsvex) where raw `<h1>`, `<h2>`, `<a>`, `<p>`, `<code>` elements appear inside lesson prose. A base layer is the only place to style those without wrapping every lesson in dozens of component replacements. The base layer earns its seat precisely because we have a content-rendering surface.

The PE7 choice — six named layers, explicit declaration, one import order — wins because every rule has a documented precedence class, and the cascade cannot be subverted by specificity games.

## What could go wrong

**Symptom:** A reset rule appears to "leak" and override a component style
**Cause:** The reset styles are unlayered, or the `@layer` declaration hasn't been registered before the reset attaches. Unlayered styles outrank every layer.
**Fix:** Wrap every reset rule inside `@layer reset { ... }`. Confirm `layers.css` (which declares the order) is the first CSS import in the root layout.

**Symptom:** A utility class like `.visually-hidden` doesn't override a component's `display: block`
**Cause:** The utility is authored without a `@layer utilities` wrapper. Unwrapped utility classes land at the default (unlayered) layer — which ironically outranks every layer — but their specificity is often lower than a component's rule, so the component wins on specificity despite the unlayered rule ostensibly having higher precedence. The interaction is counter-intuitive.
**Fix:** Always wrap utility classes in `@layer utilities { ... }`. Then the layer ordering takes over and the utility reliably wins.

**Symptom:** Svelte component styles don't land in `@layer components` as expected
**Cause:** Svelte's default behavior emits component styles without a wrapping layer. The @layer pattern for component styles requires opt-in.
**Fix:** Each `<style>` block in a `.svelte` file can be wrapped: `<style>@layer components { /* rules here */ }</style>`. Or configure a PostCSS/Svelte preprocessor to wrap them automatically. We'll address the convention in the first real component lesson; for now, inline `@layer components { ... }` in each `.svelte` `<style>`.

**Symptom:** `prefers-reduced-motion` still lets transitions play
**Cause:** A component's transition rule has `!important` or higher specificity than the reset's universal rule.
**Fix:** Every reset rule that targets accessibility (reduced motion, visible focus) uses `!important`. Accessibility is the one legitimate use of `!important` in the PE7 playbook.

## Verify

```bash
# Layer declaration is present
grep "@layer reset, tokens, base, components, utilities, overrides" src/lib/styles/layers.css
```

Expected: one match.

```bash
# Every style file uses a named layer
grep -l "@layer" src/lib/styles/*.css
```

Expected: every file (layers, reset, tokens, breakpoints, typography, base) appears.

```bash
# Layer order in +layout.svelte — layers.css imports first
grep -n "styles/" src/routes/+layout.svelte
```

Expected: `layers.css` appears before any other style import.

```bash
pnpm check
pnpm build
```

Expected: 0 errors.

**DevTools check:** Open the running dev server, open the Elements panel, inspect any styled element. In the Styles sidebar, named layers show up as `@layer [name]` groups, each with its rules nested. Confirm the stacking order matches the declaration: `reset` at the bottom, `overrides` at the top.

## Mistake log — things that went wrong the first time I did this

- **Forgot to import `layers.css` FIRST.** Initial ordering had `tokens.css` before `layers.css`. The tokens file declared `@layer tokens { ... }`, which registered a nameless layer — no precedence relationship with other layers yet. When `layers.css` loaded, its declaration registered `tokens` again at a specific precedence. CSS spec says re-declaring an existing layer name is a no-op, so the tokens layer stayed at its implicitly-registered position. Components layered later behaved fine, but the visual cascade was inconsistent during dev server HMR. Switched the import order so `layers.css` comes first; everything downstream registers into the already-declared order.
- **Wrapped `reset.css` contents in `@layer {` without a name.** An anonymous layer has the lowest precedence of any layer, but cannot be referenced by name elsewhere. Fine for this case, but I realized that debugging required the ability to target the reset by name from DevTools. Renamed to `@layer reset { ... }` so the DevTools Elements panel shows it explicitly.
- **Put `!important` on `outline` for focus-visible.** Looked lazy; tried to remove it. Discovered that a common pattern in component styles is to set `outline: none` on focus-visible and substitute a custom ring. The component's `outline: none` then overrides the base `outline: 2px solid ...` because they're in different layers (components > base). Left the `!important` in the reset's accessibility block, but moved the `:focus-visible` outline rule into the base layer where it's a sensible default, overridable by components that want something different.
- **Base `h1`-`h6` styles conflicted with Markdown rendering.** The mdsvex-rendered Markdown produces raw `<h1>` through `<h6>`. The base layer sizes them with the fluid scale — `h1 = 4xl = 48px → 60px`, `h2 = 3xl = 38px → 48px`, etc. First test rendered correctly. Second test (a lesson with nested headings) looked off because `h4` at 24px was visually similar to the body text. Adjusted line-heights and margins at the lesson-renderer level in Module 3; the base layer stays as-is.

## Commit this change

```bash
git add src/lib/styles/layers.css src/lib/styles/reset.css src/lib/styles/base.css src/routes/+layout.svelte
git add curriculum/module-01-foundation/lesson-011-layer-cascade.md
git commit -m "feat(styles): set up @layer cascade with reset + base + lesson 011"
```

With the cascade explicit, every CSS rule in this codebase has a declared precedence class. Lesson 012 picks up the iconography pipeline — installing Iconify with Phosphor and Carbon sets for inline SVG icons.
