---
number: 12
commit: 1d81d1d946c2d7b2933e999231feb36f4adb53ae
slug: iconify
title: Install Iconify with Phosphor and Carbon icon sets
module: 1
moduleSlug: foundation
moduleTitle: Foundation
phase: 1
step: 12
previous: 11
next: 13
estimatedMinutes: 10
filesTouched:
  - package.json
  - pnpm-lock.yaml
  - src/routes/+page.md
---

## Context

Every modern UI needs icons. ForgeSchool needs them for navigation (menus, close buttons, carets), for semantic enrichment (lock icons on paid lessons, checkmarks on completed modules), for motion affordances (loading spinners, arrows pointing to actions). Three design goals constrain the choice: icons must **scale with typography** (our type scale is fluid; icons should follow), **inherit color** (our themeable tokens decide hue, not a hard-coded fill), and **ship without network roundtrips** (no remote SVG URLs, no icon fonts loaded from a CDN).

Iconify is the toolchain that satisfies all three. Its Svelte binding (`@iconify/svelte`) renders icons as inline SVG with `currentColor` fills — meaning a parent `color: var(--color-brand)` cascades into the icon's strokes automatically, and a parent `font-size: var(--font-size-xl)` scales it fluidly because SVG inherits `em` units from its parent. And the per-set collections (`@iconify-json/ph`, `@iconify-json/carbon`) ship as local JSON bundles — zero runtime requests, the glyphs are part of the app's own bundle output.

This lesson installs three packages and demonstrates end-to-end iconography in the smoke-test homepage. The choice of two specific sets (Phosphor and Carbon) is deliberate and covered in the judgment section below.

## The command

Install the Iconify Svelte binding plus the two icon-set packages we've committed to:

```bash
pnpm add @iconify/svelte @iconify-json/ph @iconify-json/carbon
```

After this completes, `package.json` gains a `dependencies` block (note: `dependencies`, not `devDependencies` — these ship in the runtime bundle):

```json
"dependencies": {
  "@iconify-json/carbon": "^1.2.20",
  "@iconify-json/ph": "^1.2.2",
  "@iconify/svelte": "^5.2.1"
}
```

Update the smoke-test homepage at `src/routes/+page.md` to demonstrate the three properties simultaneously — inline rendering, `currentColor` inheritance, fluid-scale sizing:

```svelte
<script lang="ts">
  import Icon from '@iconify/svelte';
</script>

# Welcome to ForgeSchool

<p aria-label="ForgeSchool iconography smoke test" style="display: flex; gap: 0.75rem; align-items: center; font-size: var(--font-size-xl); color: var(--color-brand);">
  <Icon icon="ph:lightning-bold" aria-hidden="true" />
  <Icon icon="carbon:code" aria-hidden="true" />
  <span style="font-size: var(--font-size-base); color: var(--color-fg-muted);">
    Iconify smoke test — Phosphor + Carbon glyphs inheriting currentColor.
  </span>
</p>

This is a smoke test for the [mdsvex](https://mdsvex.pngwn.io/) pipeline...
```

Two things to note about the inline styles. First, they're transient — they'll move into proper scoped component styles when real components replace the smoke test. Second, the `color: var(--color-brand)` on the parent `<p>` is the whole point: the icons inherit it. Changing the brand token in `tokens.css` rotates the icon color automatically, with no icon-specific CSS needed.

Verify:

```bash
pnpm check
pnpm build
pnpm dev
```

Open the dev server in a browser. The home page should render two inline SVG glyphs — a Phosphor lightning bolt and a Carbon code glyph — in the brand amber color, scaling with the fluid `--font-size-xl` token.

## Why we chose this — the PE7 judgment

**Alternative 1: Lucide**
Lucide is a popular icon set with excellent Svelte bindings. It is not in our locked stack because the PROMPT explicitly rules it out: "Zero Lucide." Billy's reasoning: Lucide has become the default across too many React starter kits; its aesthetic is now synonymous with "yet another Bootstrap/Tailwind starter" and signals a generic visual identity. ForgeSchool is not generic. Phosphor (primary) and Carbon (secondary) produce a visual language that reads as deliberate — Phosphor for product UI (rounded, friendly, six weight variants), Carbon for technical content (sharper, IBM-origin, maps well to developer-tooling metaphors).

**Alternative 2: An icon font (Font Awesome, Material Icons as a web font)**
Icon fonts ship via `@font-face` and render glyphs via ligatures or code points. They have three structural flaws. First, font loading introduces FOIT/FOUT — the icon is invisible or a fallback glyph until the font downloads. Second, icon fonts don't respect `prefers-reduced-data`; the whole font loads regardless of which glyphs a page uses. Third, screen readers misread code-point glyphs as punctuation. Inline SVG has none of these problems.

**Alternative 3: SVG sprites (a single sprite sheet referenced via `<use xlink:href>`)**
Sprites are bundle-efficient — one request serves every icon. They're also pre-Iconify-era infrastructure. The `<use>` reference has [well-documented issues with CSS inheritance](https://css-tricks.com/svg-use-with-external-reference-take-2/) — `currentColor` works in some contexts and not others, shadow DOM boundaries break things, and cross-origin references require CORS gymnastics. Inline SVG avoids every one of these. In 2026, bundle size from inline SVG is negligible because each icon is ~200 bytes after gzip.

**Alternative 4: Hand-authored SVG files imported per-use**
The `svg-to-svelte` generator in lesson 013 handles exactly this for project-specific icons (the ForgeSchool logomark, custom course badges). For the general-purpose icon library — 10,000+ common glyphs — Iconify is strictly superior because we get `arrow-right`, `check`, `chevron-down`, `x-close`, `search`, `trash`, `pencil`, and the other 99 icons our UI will need without authoring or committing a single SVG file.

**Alternative 5: React-Icons ported via a Svelte shim**
Using React-Icons inside Svelte is technically possible via a React→Svelte bridge. That bridge is a runtime tax — every icon ships two copies of its rendering logic (the React one and the adaptor). Iconify is Svelte-native; the bridge approach is strictly worse.

The PE7 choice — `@iconify/svelte` with Phosphor + Carbon JSON bundles — wins because it produces inline SVG, inherits color, scales with font size, ships no remote requests, and covers 10,000+ glyphs with zero custom authoring.

## What could go wrong

**Symptom:** Icons render as broken placeholders (small empty boxes)
**Cause:** The icon name is wrong — `ph:lightning` vs. `ph:lightning-bold` vs. `ph:lightning-fill`. Phosphor has six weight variants (`thin`, `light`, `regular`, `bold`, `fill`, `duotone`) and the name must include the suffix.
**Fix:** Browse [icones.js.org](https://icones.js.org/) or [icon-sets.iconify.design](https://icon-sets.iconify.design/) for the exact name. Names are case-sensitive.

**Symptom:** Icon shows at 16×16 regardless of parent `font-size`
**Cause:** The parent element doesn't have a `font-size` declared, or the Icon component has an explicit `width`/`height` prop overriding inheritance.
**Fix:** Parent must have `font-size: var(--font-size-xl)` (or similar). Remove any explicit width/height props from `<Icon>`; the default is `1em × 1em` which scales with font-size.

**Symptom:** Icons render the wrong color
**Cause:** The icon's paths use a hard-coded `fill`/`stroke` instead of `currentColor`. Most Iconify icons use `currentColor` by default, but some imported-from-elsewhere sets don't.
**Fix:** If the icon's source SVG uses a hard color, the fix is upstream in the icon set. For Phosphor and Carbon, `currentColor` is standard — the icons will match the parent's `color` property. If they don't, double-check the `color` is set on the parent.

**Symptom:** `pnpm build` fails with `Cannot find module '@iconify-json/ph/icons.json'`
**Cause:** The icon JSON bundle isn't loading because the import path is wrong. The correct usage via `@iconify/svelte` is `<Icon icon="ph:lightning-bold" />` — you don't import the JSON directly; Iconify resolves the set name (`ph`) to the installed package (`@iconify-json/ph`) automatically.
**Fix:** Remove any direct JSON imports. Use the `icon` prop with the `set:name` string form only.

**Symptom:** Icon flash of missing-glyph on first render, then fills in
**Cause:** `@iconify/svelte` by default fetches icons asynchronously. Because we installed the set packages locally, resolution is synchronous — but Iconify's Svelte binding still uses the async path unless configured.
**Fix:** Iconify's Svelte binding supports synchronous local resolution when the set packages are installed. Ensure the set packages are installed as dependencies (not devDependencies) so they're in the runtime bundle.

## Verify

```bash
# Three Iconify packages are declared in dependencies (not devDependencies)
grep -A3 '"dependencies"' package.json
```

Expected: `@iconify/svelte`, `@iconify-json/ph`, `@iconify-json/carbon` all listed.

```bash
# The smoke-test page references Icon
grep 'Icon icon=' src/routes/+page.md
```

Expected: at least two lines, one with `ph:` prefix and one with `carbon:` prefix.

```bash
pnpm check
pnpm build
```

Expected: 0 errors, clean build.

**Live-browser check:** Open `pnpm dev`, navigate to `/`. The two icons should render inline in the brand color, at roughly 24px (scaled by `--font-size-xl`). Resize the browser; icons scale with the fluid type scale. Toggle OS dark mode; icons follow the brand token's dark-mode value (`--color-primary-400` in dark).

## Mistake log — things that went wrong the first time I did this

- **Installed the icon set packages as `devDependencies` by habit.** Build succeeded locally because node_modules has them regardless. Production build included them because Vite's bundler pulled them through the `@iconify/svelte` runtime path. But the dependency graph was misleading: anyone reading `package.json` would think the sets were build-time only. Moved to `dependencies` with `pnpm remove --save-dev @iconify-json/ph @iconify-json/carbon && pnpm add @iconify-json/ph @iconify-json/carbon`. Now `package.json` tells the truth about what ships in the runtime.
- **Tried to use `lucide-svelte` out of habit.** Started with `pnpm add lucide-svelte`, then remembered PROMPT.md explicitly bans Lucide. Uninstalled, and reviewed the Phosphor + Carbon coverage to confirm they span what we need. Result: every icon ForgeSchool will use is covered by one of the two sets.
- **Wrote `<Icon icon="ph-lightning-bold" />` with a hyphen separator.** The Iconify set:name convention uses a colon: `ph:lightning-bold`. Single-hyphen names are from the deprecated `@iconify/icons-ph` packages; `@iconify-json/ph` uses the modern set:name form. Renamed to colon-separated and the icon rendered immediately.
- **Forgot `aria-hidden="true"` on decorative icons.** Screen readers announced "graphic: lightning bolt" next to headings, which isn't the intent — the icon is decoration, not content. Added `aria-hidden="true"` to each `<Icon>` and a single `aria-label` on the wrapping element that describes the group as a whole.

## Commit this change

```bash
git add package.json pnpm-lock.yaml src/routes/+page.md
git add curriculum/module-01-foundation/lesson-012-iconify.md
git commit -m "feat(icons): install Iconify + Phosphor + Carbon + lesson 012"
```

With a 10,000+ glyph library available, every UI affordance — arrows, checkmarks, navigation, loading states — can render as inline SVG with token-driven color and fluid-scale sizing. Lesson 013 adds the project-specific half of the icon story: a `svg-to-svelte` generator for custom brand marks we author by hand.
