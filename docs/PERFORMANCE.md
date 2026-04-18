# Performance & Lighthouse targets

## Targets (public pages)

| Metric | Target | Why |
|---|---|---|
| Performance | ≥ 95 | PE7 minimum |
| Accessibility | ≥ 95 | Covered in axe-core pass |
| Best Practices | ≥ 95 | No mixed content, secure headers |
| SEO | ≥ 95 | SeoMeta component + sitemap |
| LCP | < 2500ms | Hero paint |
| CLS | < 0.1 | Explicit dims on every image |
| INP | < 200ms | Synchronous handlers only on critical paths |

## Code-splitting inventory

SvelteKit auto-splits per route. Audit via `pnpm build -- --debug` —
any route > 300 KB gzipped needs investigation. As of Phase 7 none breach.

## Preload budget

- Critical CSS: inlined by SvelteKit at build
- Fonts: self-hosted woff2 (when we add custom fonts) with `font-display: swap`
- Third-party scripts: Plausible only (defer); Stripe loaded on /checkout pages only

## Measurement

Two runs per page (desktop + mobile) with Chrome DevTools Lighthouse.
Mobile uses the default throttling profile (Slow 4G, 4× CPU).

## Baseline (pre-polish)

- Landing: Perf 87 / A11y 96 / BP 100 / SEO 100
- Pricing: Perf 92 / A11y 98 / BP 100 / SEO 100
- Lesson view: Perf 94 / A11y 95 / BP 100 / SEO 100

## Post-polish (target)

- Every public page: ≥ 95 across the board.
