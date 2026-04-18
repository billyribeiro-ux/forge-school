# Changelog

All notable changes to this project will be documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
