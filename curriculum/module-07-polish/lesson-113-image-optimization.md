---
number: 113
slug: image-optimization
title: Image optimization policy
module: 7
moduleSlug: polish
moduleTitle: Polish
phase: 7
step: 3
previous: 112
next: null
estimatedMinutes: 5
filesTouched:
  - docs/IMAGES.md
---

## Context

ForgeSchool v1 ships minimal static imagery (the ForgeMark SVG, favicon). When product thumbnails land (seed populates `thumbnail_url`), the pipeline is:

1. Source files live in `static/product-images/*.{jpg,png}`.
2. `@sveltejs/enhanced-img` emits AVIF → WebP → JPEG at three sizes (480, 1024, 1600).
3. The generated `enhanced:img` element picks the best match per viewport via `srcset`.
4. All images are `loading="lazy"` except the hero's first image which is `eager` + `fetchpriority="high"`.

## The command

Create `docs/IMAGES.md` with the policy above. When the first product thumbnail lands, add `@sveltejs/enhanced-img` (pnpm add -D) and the `vite` config entry documented in the SvelteKit docs.

For now this is documentation-only — the codebase has no product images yet.

```bash
pnpm check
```

## Why we chose this — the PE7 judgment

**Alt 1: Cloudinary / imgproxy.** Third-party hop per request. Fine for scale; overkill for v1.
**Alt 2: Ship raw JPEGs.** Wastes bandwidth; Lighthouse flags.
**Alt 3: Only AVIF, no fallbacks.** Safari before 16 blanks. JPEG fallback is the last-line compatibility.

## Verify

Policy documented. Implementation lands when the first product image ships.

## Mistake log

- Proposed WebP only — Safari 14 needed AVIF+JPEG path. Added JPEG fallback.

## Commit

```bash
mkdir -p docs && git add docs/IMAGES.md curriculum/module-07-polish/lesson-113-image-optimization.md
git commit -m "docs(images): optimization policy + lesson 113"
```
