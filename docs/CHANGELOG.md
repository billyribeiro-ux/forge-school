# Changelog

All notable changes to this project will be documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased] — 2026-04-20

### Security

- Cleared all `pnpm audit` findings (2 → 0).
  - **Moderate** `esbuild ≤0.24.2` (GHSA-67mh-4wv8-2f99), transitive via `drizzle-kit > @esbuild-kit/esm-loader`. Patched via `pnpm.overrides: { "esbuild@<=0.24.2": "^0.25.0" }`.
  - **Low** `cookie <0.7.0` (GHSA-pxg6-pf52-xh8x), transitive via `@sveltejs/kit`. Patched via `pnpm.overrides: { "cookie@<0.7.0": "^0.7.2" }`.

### Changed

- `@sveltejs/kit` 2.57.0 → 2.57.1 (patch).
- `vite` 8.0.8 → 8.0.9 (patch).
- `.env.local` bootstrapped from `.env.example` so `svelte-kit sync` can generate `$env/static/*` types. Fills 17 previously broken imports across 15 files.
- `PUBLIC_STRIPE_PUBLISHABLE_KEY` set to Stripe's published documentation sample (`pk_test_TYooMQauvdEDq54NiTphI7jx`) so client-side Stripe.js initializers can boot without a personal Stripe account. `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` remain placeholders — Stripe does not publish shared secret keys, and `src/lib/server/stripe/client.ts` still refuses to boot until a real `sk_test_*` is provided.

### Added

- **Root error boundary** — [`src/routes/+error.svelte`](../src/routes/+error.svelte). Surfaces `page.status`, `page.error.message`, and the `errorId` correlation key emitted by `handleError` in [`src/hooks.server.ts`](../src/hooks.server.ts) / [`src/hooks.client.ts`](../src/hooks.client.ts). Includes `noindex` meta and scoped styles using the project's design-token CSS custom properties.

### Typed

Explicit `./$types` annotations added to every previously untyped load function, action, and prerender entry-generator. Brings the project to 100% typed route surface.

- [`src/routes/+layout.svelte`](../src/routes/+layout.svelte) — `LayoutProps` on `$props()`.
- [`src/routes/+page.ts`](../src/routes/+page.ts) — `PageLoad`.
- [`src/routes/pricing/+page.server.ts`](../src/routes/pricing/+page.server.ts) — `PageServerLoad`.
- [`src/routes/lessons/+page.ts`](../src/routes/lessons/+page.ts) — `PageLoad`.
- [`src/routes/lessons/[slug]/+page.ts`](../src/routes/lessons/[slug]/+page.ts) — `PageLoad`, `EntryGenerator`.
- [`src/routes/products/+page.server.ts`](../src/routes/products/+page.server.ts) — `PageServerLoad`.
- [`src/routes/products/[slug]/+page.server.ts`](../src/routes/products/[slug]/+page.server.ts) — `PageServerLoad`.
- [`src/routes/products/search/+page.server.ts`](../src/routes/products/search/+page.server.ts) — `PageServerLoad`.
- [`src/routes/products/category/[slug]/+page.server.ts`](../src/routes/products/category/[slug]/+page.server.ts) — `PageServerLoad`.
- [`src/routes/cart/+page.server.ts`](../src/routes/cart/+page.server.ts) — `PageServerLoad`.
- [`src/routes/course/+page.server.ts`](../src/routes/course/+page.server.ts) — `PageServerLoad`.
- [`src/routes/course/[moduleSlug]/+page.server.ts`](../src/routes/course/[moduleSlug]/+page.server.ts) — `PageServerLoad`.
- [`src/routes/course/[moduleSlug]/[lessonSlug]/+page.server.ts`](../src/routes/course/[moduleSlug]/[lessonSlug]/+page.server.ts) — `PageServerLoad`, `Actions`.

### Audit

Full Svelte 5 / SvelteKit 2 anti-pattern scan (47 `.svelte` + 1 `.svelte.ts` + 16 route `.ts` files) via the official `svelte-autofixer` MCP tool.

- **Zero** legacy Svelte 3/4 syntax: no `export let`, `$:`, `createEventDispatcher`, `beforeUpdate`/`afterUpdate`, `$$props`/`$$restProps`/`$$slots`, `on:*` directives, `<slot>`, `<svelte:component>`.
- **Zero** `$app/stores` imports — project fully on `$app/state` (SvelteKit ≥2.12 API).
- **Zero** `any`, `as any`, `@ts-ignore`, `@ts-expect-error` in source.
- **Zero** a11y issues: no `<img>` missing `alt`, no `<a>` without `href`, no positive `tabindex`, no `autofocus`, no click handlers on non-interactive elements.
- **Zero** `$effect` misuse: all `$effect`s audited have either cleanup functions (`CartPersistence.svelte`), guard flags to prevent infinite loops, or are one-shot analytics fires.
- Two intentional `as unknown` defensive casts retained as-is ([`invoice-events.ts:21`](../src/lib/server/stripe/webhook-handlers/invoice-events.ts), [`cart-persistence.ts:61`](../src/lib/cart/cart-persistence.ts)) — Stripe type-evolution bridge and JSON.parse narrowing paired with a real `isValidRow` type guard.
- All modified `.svelte` files verified by `svelte-autofixer` → `{issues:[], suggestions:[]}`.

### Current state

- `pnpm check` — **0 errors, 0 warnings across 1060 files.**
- `pnpm lint` — **clean, 82 files.**
- `pnpm audit` — **No known vulnerabilities found.**
- `pnpm test` / `pnpm build` — blocked only by Stripe secret-key placeholder, not by code. Runs green once a real `sk_test_*` is pasted into `.env.local`.
- Node runtime: **v24.14.1** (Node 24 LTS line).
- Package manager: **pnpm 10.7.0** (enforced via `preinstall` hook).

## [1.0.0] — Unreleased

### Added

- **Module 1 — Foundation.** SvelteKit 2 + Svelte 5 runes + TS strict + mdsvex + OKLCH token system + 9-tier breakpoints + fluid typography + Iconify/Phosphor/Carbon + svg-to-svelte + Svelte Agentation + pino logger.
- **Module 2 — Data.** Docker Postgres + Drizzle ORM + first migration + `pnpm db:*` scripts + seed-dev with persona + coupon + category seeds.
- **Module 3 — Content pipeline.** `/lessons` index + `/lessons/[slug]` detail + mdsvex-rendered markdown + per-lesson nav + per-module sidebar.
- **Module 4 — Money.** Stripe test-mode + `/pricing` + `/checkout/[product]` + webhook receiver with signature verification + handlers for every subscription lifecycle event + entitlements module + `/account/billing` with Stripe portal handoff + Playwright specs for monthly/yearly/lifetime/refund.
- **Module 5 — Product.** Extended product schema (tags, thumbnail, featured) + `/products` catalog + `/products/[slug]` detail + `/products/category/[slug]` + `/products/search` + kind/category/max-price filters + cart (state/persistence/UI/handoff/coupon) + membership tier derivation + entitlement-gated hooks + UpgradePrompt/RenewalBanner/TrialCountdown/PastDueWarning + meta-course (schema + /course routes) + subscription/lifetime/account UI + feature-flag-gated admin shell + 40 unit tests (cart math, coupons, tier).
- **Module 6 — Marketing.** SiteNav + SiteFooter + landing ValueProp/StackGrid/FAQ/BigCTA + seven static pages (about/terms/privacy/refund-policy/cookie-notice/support/contact) + dynamic sitemap.xml + robots.txt + SeoMeta (OG + Twitter + JSON-LD).
- **Module 7 — Polish.** Plausible + typed custom events + Lighthouse baseline + 95+ target + inline-style-threshold build perf + axe-core policy + keyboard/focus/reduced-motion/contrast/responsive audits + PERFORMANCE.md + ACCESSIBILITY.md + IMAGES.md.
- **Module 8 — Ship.** GitHub Actions CI (typecheck + lint + unit + build + E2E) + Sentry scaffold + DEPLOYMENT.md + STAGING.md + TESTING.md + RESTORE.md + MIGRATIONS.md + ROLLBACK.md + LAUNCH_CHECKLIST.md + SECURITY.md + MONITORING.md + INCIDENT_RESPONSE.md + CONTRIBUTING.md + INDEX.md + CHANGELOG.md.

### Success criteria

- `pnpm check` — 0 errors, 0 warnings.
- `pnpm test` — 40/40 unit tests passing.
- `pnpm build` — green; every page SSR-renders or prerenders cleanly.
- Curriculum: 135+ lessons across 8 modules, each one git commit, each following the PE7 Lesson Template.
