---
number: 141
commit: e137413c6d22d0e5f761c5a4d63431872552fae2
slug: enhanced-img
title: Install @sveltejs/enhanced-img + wire the Vite plugin
module: 9
moduleSlug: followup
moduleTitle: v1.0 Follow-up
phase: 9
step: 6
previous: 140
next: null
estimatedMinutes: 10
filesTouched:
  - vite.config.ts
  - package.json
  - pnpm-lock.yaml
  - curriculum/module-07-polish/lesson-113-image-optimization.md
---

## Context

Lesson 113 documented the image policy. PROMPT step 114 calls for the actual pipeline. This lesson installs `@sveltejs/enhanced-img` + wires the Vite plugin so future product images get AVIF + WebP + JPEG variants at three sizes for free.

No product images ship in v1 — the catalog uses thumbnails-by-CSS-only — but with the plugin in place, dropping a JPEG into `src/lib/assets/products/` and using the `enhanced:img` element is one line away.

## The command

```bash
pnpm add -D @sveltejs/enhanced-img
```

`vite.config.ts`:

```diff
+ import { enhancedImages } from '@sveltejs/enhanced-img';
  import { sveltekit } from '@sveltejs/kit/vite';
  import { defineConfig } from 'vite';

  export default defineConfig({
-   plugins: [sveltekit()]
+   plugins: [enhancedImages(), sveltekit()]
  });
```

(Plugin order matters — `enhancedImages()` must precede `sveltekit()`.)

Also tighten `curriculum/module-07-polish/lesson-113-image-optimization.md` so the angle-bracket reference doesn't trip mdsvex's compile pass on `pnpm build`.

```bash
pnpm check && pnpm build
```

## Why we chose this — the PE7 judgment

**Alt 1: `vite-imagetools` directly.** `enhanced-img` wraps it with sane defaults + a Svelte component; reinventing buys nothing.
**Alt 2: Cloudinary.** Third-party hop per request. Defer until v1 traffic justifies the cost.
**Alt 3: Skip the install — document only.** The whole point of installing now is so the first image PR is one line of consumer code. Documenting without installing front-loads bug surface to "later you."

## What could go wrong

**Symptom:** `pnpm build` fails with "CompileError" referencing the `enhanced:img` element inside a markdown prose paragraph
**Cause:** mdsvex (and the enhanced-img plugin) see the literal element, try to compile it as Svelte, and flag an unclosed tag.
**Fix:** Refer to the element by name (without the angle brackets) inside markdown prose. Code blocks are fine because the plugins skip them.

**Symptom:** SVG imports stop working
**Cause:** `enhanced-img` matches `*.{jpg,jpeg,png,webp,avif,gif}` — SVGs go through Vite's default asset handling.
**Fix:** Verified — favicon SVG still loads.

## Verify

```bash
pnpm check        # 0 errors
pnpm build        # ✓ built
```

When the first product image lands, the consumer-side pattern is a single Svelte file that imports the image with the `?enhanced` query suffix and renders the `enhanced:img` element with `src={productImage}` + an `alt` string. See `docs/IMAGES.md` for the complete snippet.

## Mistake log

- Reversed the plugin order initially. SvelteKit reported "Could not resolve enhanced:img" because `sveltekit()` ran first. Swapped.
- mdsvex reject-on-compile of the literal `enhanced:img` reference in lesson 113 — caught by the next `pnpm build`. Edited the prose to drop the angle brackets.

## Commit

```bash
git add vite.config.ts package.json pnpm-lock.yaml
git add curriculum/module-07-polish/lesson-113-image-optimization.md
git add curriculum/module-09-followup/lesson-141-enhanced-img.md
git commit -m "feat(images): install @sveltejs/enhanced-img + wire Vite plugin + lesson 141"
```
