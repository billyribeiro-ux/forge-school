# ForgeSchool — Product Specification

**Version:** 1.0.0
**Author:** Billy Ribeiro
**Date:** 2026-04-17
**Status:** Active

---

## 1. Product Overview

ForgeSchool is a fullstack learning platform that teaches students how to build a production-grade membership platform with WooCommerce-equivalent functionality at PE7 Distinguished standard. The platform itself is the worked example — students browse ForgeSchool and read lessons describing how ForgeSchool was built.

### 1.1 Core Value Proposition

Most coding courses teach toy projects with toy patterns. ForgeSchool teaches real engineering judgment: why one approach survives 10 years and another collapses under its own weight. Every lesson includes the alternatives considered and the failure modes that eliminated them.

### 1.2 Target Audience

Intermediate-to-advanced developers who can write code but want to learn enterprise-grade decision-making. Not beginners. Not people who need syntax explanations. Adults who respect directness and want to ship production software.

### 1.3 Business Model

- **Free tier:** Browse all lessons without authentication (v1)
- **Pro tier:** Future — gated content, private Discord, office hours
- **Lifetime tier:** Future — one-time payment, permanent access

v1 ships auth-free. All content is publicly accessible. Stripe integration is fully wired in test mode so the payment infrastructure is production-ready when auth lands.

---

## 2. Functional Requirements

### 2.1 Content System

| Feature | Description |
|---------|-------------|
| Lesson browsing | Students navigate modules and lessons via sidebar and prev/next links |
| Markdown rendering | Lessons are authored in Markdown, rendered with mdsvex and syntax highlighting |
| Reading progress | Scroll-linked progress indicator per lesson (Motion-powered) |
| Module navigation | Sidebar shows all modules with expand/collapse, current lesson highlighted |
| Course landing page | Overview of the full curriculum with module descriptions |

### 2.2 Product Catalog (WooCommerce Parity)

| Feature | Description |
|---------|-------------|
| Product listing | Browse all products with pagination |
| Product detail | Full product page with variants, description, images |
| Category browsing | Filter products by category |
| Search | Full-text search across products |
| Filters | Price range, category, tag filters |

### 2.3 Cart System

| Feature | Description |
|---------|-------------|
| Add to cart | Client-side cart state via Svelte 5 `$state` rune |
| Cart persistence | Cookie-based persistence (no auth required) |
| Update quantity | Increment, decrement, remove items |
| Coupon application | Apply discount codes with validation |
| Cart → checkout | Handoff to Stripe Checkout |

### 2.4 Payment System (Stripe Test Mode)

| Feature | Description |
|---------|-------------|
| Checkout | Stripe Checkout Sessions for one-time and subscription products |
| Subscriptions | Monthly, yearly, lifetime plans |
| Coupons | Percentage and fixed-amount discounts |
| Webhooks | Full webhook handler with signature verification and idempotent processing |
| Entitlements | Grant/revoke access based on webhook events, never on success URL |
| Billing portal | Stripe Customer Portal handoff for self-service billing management |
| Refunds | Webhook-driven entitlement revocation on refund/dispute |

### 2.5 Membership System

| Feature | Description |
|---------|-------------|
| Tiers | Free, Pro, Lifetime membership levels |
| Entitlement gates | Route-level access control via SvelteKit hooks |
| Upgrade prompts | Motion-animated CTAs for tier upgrades |
| Lifecycle UI | Active, cancelled, past-due, trial states with appropriate messaging |
| Renewal banners | Proactive renewal prompts before expiry |
| Trial countdown | Visual countdown for trial periods |

### 2.6 Marketing Site

| Feature | Description |
|---------|-------------|
| Landing page | Hero, value prop, features grid, pricing preview, FAQ, CTA, footer |
| Motion animations | Scroll-linked reveals, hover effects, accordion, GPU-accelerated |
| Static pages | About, contact, support, terms, privacy, refund policy, cookie notice |
| SEO | Per-page OpenGraph, Twitter cards, JSON-LD, dynamic sitemap, robots.txt |
| Contact form | Server action → email delivery (Resend test account) |

### 2.7 Developer Experience

| Feature | Description |
|---------|-------------|
| Dev inspector | Svelte Agentation in dev mode, tree-shaken from production |
| Database tools | Drizzle Studio, seed scripts, reset scripts |
| Stripe CLI | Local webhook forwarding for development |
| Icon generation | svg-to-svelte pipeline from raw SVGs to typed Svelte components |

---

## 3. Non-Functional Requirements

### 3.1 Performance

- Lighthouse score 95+ on all public pages
- First Contentful Paint < 1.5s
- Time to Interactive < 3.0s
- Cumulative Layout Shift < 0.1
- Code splitting with route-based lazy loading
- Image optimization: AVIF with JPEG fallback

### 3.2 Accessibility

- WCAG 2.1 AA compliance
- Full keyboard navigation
- Screen reader compatible
- Visible focus states on all interactive elements
- `prefers-reduced-motion` respected on all Motion animations
- Color contrast ratio ≥ 4.5:1 for text, ≥ 3:1 for large text

### 3.3 Security

- Stripe webhook signature verification on every request
- No hardcoded secrets — all sensitive values in environment variables
- CSRF protection via SvelteKit defaults
- Content Security Policy headers
- No `eval()`, no `innerHTML` with user content
- Production guards on seed scripts and dev routes

### 3.4 Reliability

- Idempotent webhook processing via `webhook_events` deduplication table
- Entitlements granted on webhook confirmation, never on client redirect
- Database migrations with rollback capability
- Structured logging via pino for production debugging

### 3.5 Maintainability

- Zero `any` types, zero `@ts-ignore`
- Conventional Commits for all commit messages
- Biome for consistent linting and formatting
- Comprehensive test coverage: Vitest for unit/integration, Playwright for E2E
- GitHub Actions CI pipeline: typecheck, lint, unit tests, E2E, build verification

---

## 4. Technical Architecture

### 4.1 Stack

| Layer | Technology |
|-------|-----------|
| Framework | SvelteKit 2.x (fullstack) |
| Language | TypeScript (strict mode) |
| UI | Svelte 5 (runes only) |
| Database | PostgreSQL 16 |
| ORM | Drizzle ORM |
| Payments | Stripe (test mode) |
| Content | Markdown via mdsvex |
| Styling | Custom CSS — OKLCH tokens, @layer cascade, fluid typography |
| Icons | Iconify (Phosphor + Carbon) + svg-to-svelte |
| Animation | Motion (motion.dev) |
| Observability | Sentry, Plausible, pino |
| Testing | Vitest, Playwright |
| Tooling | Biome, Docker Compose, Stripe CLI |
| Package manager | pnpm (enforced) |

### 4.2 Database Schema (High-Level)

**Core entities:**
- `users` — future auth integration point
- `products` — catalog items with variants
- `categories` — product categorization
- `prices` — Stripe-synced pricing
- `carts` / `cart_items` — cookie-identified shopping carts
- `orders` — completed purchases
- `subscriptions` — active subscription records
- `entitlements` — access grants tied to purchases/subscriptions
- `coupons` — discount codes with usage tracking
- `webhook_events` — idempotent webhook processing log
- `lessons` — curriculum metadata (content lives in markdown files)

### 4.3 Route Architecture

```
/                           → Marketing landing page
/about                      → About page
/contact                    → Contact form
/support                    → Support page
/terms                      → Terms of service
/privacy                    → Privacy policy
/refund-policy              → Refund policy
/cookie-notice              → Cookie notice
/pricing                    → Pricing page (fetches from DB)
/lessons                    → Curriculum overview
/lessons/[slug]             → Individual lesson
/checkout/[product]         → Stripe Checkout initiation
/checkout/success           → Post-checkout confirmation
/account/billing            → Stripe Billing Portal handoff
/api/webhooks/stripe        → Stripe webhook endpoint
/dev/*                      → Dev tools (tree-shaken in prod)
```

---

## 5. Content Architecture

### 5.1 Curriculum Structure

~130–170 lessons across 8 modules:

1. **Foundation** (~15 lessons) — Project setup, tooling, CSS architecture
2. **Data** (~15 lessons) — PostgreSQL, Drizzle ORM, schema, migrations, seeding
3. **Content Pipeline** (~15 lessons) — Markdown loading, lesson routes, navigation
4. **Money** (~30 lessons) — Stripe integration, checkout, webhooks, entitlements
5. **Product** (~40 lessons) — Catalog, cart, checkout, coupons, memberships, subscriptions
6. **Marketing** (~20 lessons) — Public pages, Motion animations, SEO
7. **Polish** (~15 lessons) — Performance, accessibility, responsive design
8. **Ship** (~15 lessons) — CI/CD, monitoring, deployment, launch

### 5.2 Lesson Format

Every lesson follows the PE7 Lesson Template:
- Context (what and why)
- The command (exact steps)
- Why we chose this (alternatives and their failure modes)
- What could go wrong (symptom, cause, fix)
- Verify (concrete verification steps)
- Mistake log (real mistakes encountered)
- Commit this change

---

## 6. Deployment

### 6.1 Environments

| Environment | Purpose |
|-------------|---------|
| Local | Development with Docker Compose Postgres + Stripe CLI |
| Staging | Pre-production validation |
| Production | Live platform |

### 6.2 Infrastructure Requirements

- Node.js 20+ runtime
- PostgreSQL 16 database
- Stripe account (test keys for development, live keys for production)
- Sentry project for error tracking
- Plausible instance for analytics

---

## 7. Success Criteria

- `pnpm install` succeeds with pnpm, fails with npm/yarn
- `pnpm check` reports 0 errors, 0 warnings
- `pnpm lint` reports 0 errors
- `pnpm dev` starts with zero console errors
- `pnpm test` passes 100%
- `pnpm test:e2e` passes 100%
- Stripe test checkout works end-to-end
- Lighthouse 95+ on all public pages
- Zero `any`, zero `@ts-ignore`, zero hardcoded secrets
- All 130–170 lesson files present and following PE7 template
- Motion animations respect `prefers-reduced-motion`
- Dev routes absent from production bundle
