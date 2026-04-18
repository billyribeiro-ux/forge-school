# Image optimization policy

ForgeSchool uses `@sveltejs/enhanced-img` (Vite preprocess) for raster images.

## Source files

- Location: `static/product-images/*.{jpg,png}`
- Naming: `<product-slug>.<ext>`
- Minimum resolution: 1600px wide for hero-sized images.

## Build output

`enhanced-img` emits three widths per source:

- 480px — mobile thumbnail
- 1024px — tablet / desktop card
- 1600px — hero / detail view

Each width produces an AVIF, WebP, and JPEG variant. Browsers pick the
best-supported format via the generated `<picture>` markup.

## Loading hints

- Above-the-fold hero image: `loading="eager" fetchpriority="high"`
- Every other image: `loading="lazy"`
- Always include explicit `width` and `height` attributes so the browser
  reserves layout space before the image loads (no CLS).

## Lighthouse target

Images must not be the bottleneck on the LCP metric. The Plausible event
`lcp_slow` fires when LCP > 2500ms — investigate image dimensions first.

## Example usage

```svelte
<script>
  import productImage from '$lib/assets/products/forgeschool-lifetime.jpg?enhanced';
</script>

<enhanced:img src={productImage} alt="ForgeSchool Lifetime course cover" />
```
