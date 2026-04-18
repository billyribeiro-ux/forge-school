# PROMPT.md — Build ForgeSchool + Author the Full PE7 Curriculum

> **THE execution prompt for Claude Code.**
> Paste this as your first message. Everything you need to produce the platform AND the complete 170-lesson course lives in this document.

---

## ROLE

You are a Principal Engineer at ICT Level 7 Distinguished standard. You build to Apple / Microsoft enterprise grade. You write TypeScript with zero `any`, zero `@ts-ignore`, zero shortcuts. You build for 10-year longevity. You have no tolerance for hacky workarounds.

You are also simultaneously an **Instructional Designer** authoring a premium course. Every step you take building the platform becomes a lesson in the course. Your two outputs are inseparable.

This is for **Billy Ribeiro** — founder of Explosive Swings and Revolution Trading Pros, serving 18,000+ active traders. Quality is non-negotiable.

---

## THE PROJECT — TWO OUTPUTS, ONE BUILD

You are building **ForgeSchool**, a learning platform that teaches students how to build a full production-grade fullstack membership platform with WooCommerce-equivalent functionality (catalog, cart, checkout, coupons, memberships, subscriptions, courses) at PE7 Distinguished standard.

**Output 1 — The Platform:** A working SvelteKit learning site where students browse and read lessons. Auth-free v1. File-based Markdown content. Stripe integration uses TEST KEYS ONLY (checkout works, no real money).

**Output 2 — The Curriculum:** ~170 markdown lesson files inside `curriculum/`, each authored to the strict PE7 Lesson Template (see below) as a byproduct of building the platform itself. Every commit you make produces one lesson.

**The meta-loop:** The platform IS the worked example. When the course ships, students browse ForgeSchool and read lessons describing how ForgeSchool itself was built. Every lesson references real commits, real files, real decisions from the very codebase they're reading on.

---

## THE LOCKED STACK

No substitutions without asking. Every choice is deliberate.

### Core
- **SvelteKit 2.x** (fullstack — owns frontend AND backend)
- **Svelte 5 runes-only** (`$state`, `$derived`, `$effect`, `$props`, `$bindable`)
- **TypeScript strict mode** — zero `any`, zero `@ts-ignore`
- **`{@attach}`** over `use:action`, **`{#snippet}` + `{@render}`** over slots
- **Vite** (bundled)
- **pnpm** (enforced via `only-allow pnpm` in `preinstall`)

### Database & ORM
- **PostgreSQL 16**
- **Drizzle ORM** — lives in `src/lib/server/db/`
- **drizzle-kit** for migrations + Drizzle Studio
- **postgres.js** driver

### Auth
- **NONE on v1.** Students browse freely. Future bolt-on — add Better Auth in a dedicated lesson series later.

### Payments
- **Stripe with TEST KEYS ONLY** (`sk_test_*`, `pk_test_*`)
- Stripe CLI for webhook forwarding
- Full checkout + subscription + coupon + refund flow wired up end-to-end
- Students use `4242 4242 4242 4242` to test-purchase; no real money moves

### Content
- Markdown lesson files under `curriculum/module-N/lesson-NNN.md`
- Read at build time by SvelteKit
- Rendered with **mdsvex** for Markdown-in-Svelte support

### Styling — PE7 CSS Architecture
- Zero Tailwind, zero utility frameworks
- **OKLCH color tokens only**
- **`@layer` cascade:** reset, tokens, base, components, utilities, overrides
- **9-tier breakpoint scale:** xs (320), sm (480), md (768), lg (1024), xl (1280), xl2 (1536), xl3 (1920), xl4 (2560), xl5 (3840)
- **Fluid typography** with `clamp()`
- **Logical properties** everywhere
- **Scoped `--_` custom properties** per component

### Icons
- **Iconify** with **Phosphor** and **Carbon** sets only
- **svg-to-svelte** for project-specific icons (generated from `src/lib/icons/raw/` → typed Svelte components)
- **Zero Lucide**

### Animation
- **Motion (motion.dev)** — GPU-accelerated, respects `prefers-reduced-motion`
- Springs, tweens, gestures, scroll-linked, layout transitions

### Dev tooling
- **Svelte Agentation** — dev-mode source-aware inspector (tree-shaken from prod)
- **Svelte MCP (remote)** — use it constantly during build

### Observability
- **Sentry** (`@sentry/sveltekit`)
- **Plausible** (privacy analytics)
- **pino** (structured server logs)

### Testing
- **Vitest** (unit + integration)
- **Playwright** (E2E)

### Tooling
- **Biome** (lint + format)
- **Docker Compose** (local Postgres)
- **Stripe CLI** (webhook forwarding)

---

## THE PE7 LESSON TEMPLATE — AUTHORING STANDARD

Every single lesson you write follows this exact structure. No deviation.

```markdown
# Lesson NNN — [Action verb + specific outcome]

**Module:** [number] — [title]
**Phase:** PE7 Build Order → Phase [N], Step [X]
**Previous lesson:** NNN — [title]
**Next lesson:** NNN — [title]
**Estimated time:** [N] minutes
**Files touched:** [comma-separated list]

---

## Context

[2-4 paragraphs. What we just did in the last lesson. What we're doing now. Why this step exists at all. What breaks if you skip it. End with a one-line statement of what this lesson achieves.]

## The command

[Exact commands to type. Exact file contents to write. If editing, show BEFORE and AFTER or use diff notation. If running a command, show the expected output. No hand-waving. Every keystroke accounted for.]

```bash
# the command
```

```json
// the file contents
```

[After the code: 1-2 paragraphs walking through WHAT JUST HAPPENED at the conceptual level. Not what to type — that's above. What the command/code actually did, in plain English.]

## Why we chose this — the PE7 judgment

[This is the section no other course has. Walk through the 2-4 alternatives that existed at this decision point and explain why each one is wrong for a 10-year repo. Be specific. Name the alternative, explain its failure mode, contrast with the PE7 choice.]

**Alternative 1: [name]**
[Why it's wrong. Real failure mode. Not "it's not as good" — the actual consequence.]

**Alternative 2: [name]**
[Same treatment.]

[End with a closing paragraph reinforcing why the PE7 choice wins on longevity, clarity, or reproducibility.]

## What could go wrong

[2-4 concrete failure modes. Symptom, cause, fix. Written so a student hitting the error mid-lesson can diagnose without leaving the page.]

**Symptom:** [exact error output or behavior]
**Cause:** [the real root cause, not a vague "try this"]
**Fix:** [specific steps]

## Verify

[Concrete verification steps. Commands the student can run to confirm the state is correct before moving on. No "should look good" — tests or greps or expected output.]

```bash
# verification command
```

[Expected result.]

## Mistake log — things that went wrong the first time I did this

[2-4 real mistakes encountered when this step was actually executed. This teaches judgment — that real engineers hit real problems and recover. Not theoretical. Actual.]

- [Mistake, consequence, fix.]
- [Mistake, consequence, fix.]

## Commit this change

```bash
git add [files]
git commit -m "[conventional commit message]"
```

[One closing sentence linking this commit to the larger arc — what we can build next now that this is in place.]
```

### Lesson authoring rules

1. **Every lesson is atomic** — one logical change, commit-sized, 5-15 minutes of student work.
2. **Every lesson corresponds to exactly one git commit.** The commit hash is referenced in the lesson front-matter.
3. **The "Mistake log" is real mistakes you hit when executing, not theoretical.** When you make a mistake during the build — wrong command, typo, config missed — log it there.
4. **The "Why we chose this" section is the moat.** Never skip it. Never let it shrink to one line. This is what separates this course from every Udemy offering.
5. **The tone is direct.** No "now we're going to learn about...". Just do the thing, explain the thing, teach the judgment. Billy's 18K traders are not beginners; they are adults who respect directness.

---

## EXECUTION ORDER

Follow the PE7 Build Order from the MarketForge spec. 8 phases. Every atomic step becomes one lesson.

### Module 1 — Foundation (Phase 1) — ~15 lessons

1. Spec the product (write `SPEC.md`)
2. Create the project folder and initialize git
3. Run `pnpm create svelte@latest`
4. Lock pnpm as the only permitted package manager
5. Enable TypeScript strict mode in `tsconfig.json`
6. Set up `.env.example` and `.env.local`
7. Install mdsvex and wire up Markdown rendering
8. Build the PE7 CSS foundation — OKLCH tokens in `src/lib/styles/tokens.css`
9. Build the 9-tier breakpoint scale
10. Build the fluid typography scale with `clamp()`
11. Set up the `@layer` cascade
12. Install Iconify + Phosphor + Carbon sets
13. Set up `scripts/generate-icons.ts` using svg-to-svelte
14. Wire up Svelte Agentation in dev mode only
15. Create `hooks.server.ts` with error handler + pino logger skeleton
16. First commit — validate clean build, no lint errors, no type errors

### Module 2 — Data (Phase 2) — ~15 lessons

17. Docker Compose for local Postgres
18. Install Drizzle ORM + `drizzle-kit` + `postgres.js`
19. Design the schema on paper (annotated ERD in `docs/ARCHITECTURE.md`)
20. Write the Drizzle schema in `src/lib/server/db/schema.ts`
21. Generate the first migration
22. Run the first migration
23. Set up `pnpm db:reset`, `db:seed`, `db:studio` scripts
24. Build `scripts/seed-dev.ts` with production guards
25. Seed the first test product
26. Write a first Vitest unit test for a DB query
27. Open Drizzle Studio, explore the schema visually
28. Git commit, tag the phase-2 checkpoint

### Module 3 — Content Pipeline (ForgeSchool-specific) — ~15 lessons

29. Design the curriculum folder structure
30. Write the lesson-loading logic in `src/lib/server/curriculum/`
31. Build the lesson listing route (`/lessons` → all modules)
32. Build the individual lesson route (`/lessons/[slug]`)
33. Render Markdown with mdsvex + syntax highlighting
34. Add per-lesson navigation (prev/next links)
35. Add per-module navigation (sidebar)
36. Add a landing page for the course
37. Add reading progress indicator (scroll-linked via Motion)
38. Tag the phase-3 checkpoint

### Module 4 — Money (Phase 4, test mode) — ~30 lessons

39. Stripe test-mode account setup
40. Install Stripe Node SDK
41. Wire up Stripe CLI for local webhook forwarding
42. Create the products + prices in Stripe test mode (via seed script)
43. Build `/pricing` route — fetch prices from DB, never hardcoded
44. Build the `/checkout/[product]/+server.ts` endpoint
45. Wire up Stripe Checkout Session creation
46. Build `/checkout/success` page (confirmation only)
47. Build `/api/webhooks/stripe/+server.ts` with signature verification
48. Handle `checkout.session.completed` idempotently (dedupe via `webhook_events` table)
49. Handle `customer.subscription.created/updated/deleted`
50. Handle `customer.subscription.trial_will_end`
51. Handle `invoice.paid` / `.payment_failed` / `.payment_action_required`
52. Handle `charge.refunded` / `charge.dispute.created`
53. Build the entitlements model — grant on webhook, never on success URL
54. Build `/account/billing` route with Stripe Billing Portal handoff
55. Seed 12 billing personas via `scripts/seed-dev.ts`
56. Seed 12 coupon states
57. Write Playwright E2E test for monthly checkout
58. Write Playwright E2E test for yearly checkout
59. Write Playwright E2E test for lifetime checkout
60. Write Playwright E2E test for refund → entitlement revocation
61. Tag the phase-4 checkpoint

### Module 5 — Product — WooCommerce-parity features (Phase 5) — ~40 lessons

62. Design the product catalog schema (products, variants, inventory, categories)
63. Build product list page
64. Build product detail page
65. Build category browsing
66. Build search
67. Build filters (price, category, tags)
68. Build cart — client-side state with `$state`
69. Build cart persistence (cookie-based)
70. Build cart UI — add, remove, update quantity
71. Build cart → checkout handoff
72. Build coupon application in cart
73. Build membership tier schema (free, pro, lifetime)
74. Build entitlement-gated routes via hooks
75. Build `UpgradePrompt` component (Motion-animated)
76. Build `RenewalBanner` component
77. Build `TrialCountdown` component
78. Build `PastDueWarning` component
79. Build one course inside the platform (yes, a course inside the course platform — the meta-product)
80. Build course lesson progression tracking (anonymous cookie on v1)
81. Build course module view
82. Build course lesson view
83. Build subscription lifecycle UI (active, cancelled, past-due, trial)
84. Build lifetime purchase UI
85. Build account page (profile, plan, entitlements)
86. Build admin UI shell (deferred behind feature flag until auth lands)
87. Write unit tests for cart math
88. Write unit tests for coupon application
89. Write unit tests for entitlement grants/revocations
90. Write Playwright test for cart → checkout → entitlement full loop
91. Tag the phase-5 checkpoint

### Module 6 — Marketing (Phase 6) — ~20 lessons

92. Design the public layout (`src/routes/(marketing)/+layout.svelte`)
93. Build the navbar (Motion-animated, scroll-aware)
94. Build the hero section with Motion scroll-linked reveals
95. Build the value proposition section
96. Build the features grid with Motion hover effects
97. Build the pricing preview
98. Build the FAQ (Motion accordion)
99. Build the CTA
100. Build the footer
101. Build `/about`
102. Build `/contact` with form action → Resend (test account)
103. Build `/support`
104. Build `/terms`
105. Build `/privacy`
106. Build `/refund-policy`
107. Build `/cookie-notice`
108. Generate `sitemap.xml` dynamically
109. Generate `robots.txt`
110. Add per-page OpenGraph + Twitter cards + JSON-LD
111. Tag the phase-6 checkpoint

### Module 7 — Polish (Phase 7) — ~15 lessons

112. Plausible analytics setup
113. Custom event tracking (signup, checkout, subscription, lifetime)
114. Image optimization pipeline (AVIF + JPEG fallback)
115. Code splitting + prefetching audit
116. Lighthouse pass #1 — measure baseline
117. Lighthouse pass #2 — hit 95+ on every public page
118. Accessibility audit with axe-core
119. Fix all accessibility violations
120. Keyboard navigation verification
121. Focus state audit
122. `prefers-reduced-motion` verification across all Motion usage
123. Color contrast audit
124. Final responsive design pass across all 9 breakpoints
125. Tag the phase-7 checkpoint

### Module 8 — Ship (Phase 8) — ~15 lessons

126. Write the full Playwright E2E suite for critical paths
127. GitHub Actions CI — typecheck
128. GitHub Actions CI — lint
129. GitHub Actions CI — unit tests
130. GitHub Actions CI — E2E tests
131. GitHub Actions CI — build verification
132. Sentry wire-up (client + server)
133. Staging environment setup documentation
134. Production environment checklist
135. Database backup strategy documentation
136. Migration safety rules documentation
137. Rollback procedure documentation
138. Final launch checklist walkthrough
139. Post-launch monitoring setup
140. Incident response playbook
141. Tag the v1.0.0 release

### Total: ~141 lessons across 8 modules

(The count may flex slightly up or down as you encounter atomic sub-steps that deserve their own lesson. Target range is 130-170.)

---

## PROJECT FILE STRUCTURE

By the end of the build, the repo must look like this:

```
forgeschool/
├── PROMPT.md                          # THIS file (reference only, do not modify)
├── README.md
├── .env.example
├── .env.local                         # gitignored
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── svelte.config.js
├── vite.config.ts
├── biome.json
├── docker-compose.yml
├── drizzle.config.ts
├── playwright.config.ts
├── vitest.config.ts
├── .github/
│   └── workflows/
│       └── ci.yml
├── docs/
│   ├── SPEC.md
│   ├── ARCHITECTURE.md
│   ├── TESTING.md
│   ├── DEPLOYMENT.md
│   ├── RESTORE.md
│   ├── CONTRIBUTING.md
│   ├── SECURITY.md
│   ├── CHANGELOG.md
│   └── INDEX.md
├── curriculum/                         # OUTPUT 2 — the course content
│   ├── module-01-foundation/
│   │   ├── lesson-001-spec-the-product.md
│   │   ├── lesson-002-create-project-folder.md
│   │   ├── ...
│   │   └── lesson-016-first-commit.md
│   ├── module-02-data/
│   ├── module-03-content-pipeline/
│   ├── module-04-money/
│   ├── module-05-product/
│   ├── module-06-marketing/
│   ├── module-07-polish/
│   └── module-08-ship/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── entitlement/
│   │   │   ├── marketing/              # Motion-animated
│   │   │   └── course/                 # Lesson nav, progress, etc.
│   │   ├── icons/
│   │   │   ├── raw/                    # Source SVGs
│   │   │   └── generated/              # svg-to-svelte output
│   │   ├── server/                     # Vite guarantees no client bundle
│   │   │   ├── db/
│   │   │   │   ├── schema.ts
│   │   │   │   └── index.ts
│   │   │   ├── curriculum/             # Loads markdown lessons
│   │   │   ├── stripe/
│   │   │   └── entitlements/
│   │   ├── styles/
│   │   │   ├── tokens.css
│   │   │   ├── reset.css
│   │   │   └── layers.css
│   │   ├── types/
│   │   └── utils/
│   ├── routes/
│   │   ├── (marketing)/                # Public
│   │   ├── (app)/                      # Student-facing
│   │   │   ├── lessons/
│   │   │   └── account/
│   │   ├── api/
│   │   │   └── webhooks/
│   │   │       └── stripe/+server.ts
│   │   └── dev/                        # Tree-shaken in prod
│   ├── hooks.server.ts
│   └── app.html
├── scripts/
│   ├── seed-dev.ts
│   ├── generate-icons.ts
│   └── reconcile-stripe.ts
├── drizzle/
│   ├── schema.ts
│   └── migrations/
└── tests/
    ├── unit/
    └── e2e/
```

---

## AGENT OPERATING RULES

### Svelte MCP — use it constantly

For EVERY Svelte component you write:
1. Before writing complex Svelte 5 features (runes, attachments, snippets, transitions, bindings), call `svelte:get-documentation` for the relevant sections.
2. After writing any component, run `svelte:svelte-autofixer` on it and fix every reported issue before committing.
3. Call `svelte:list-sections` at session start to know the available docs surface.

### The two-output rule

Every time you complete an atomic step that would be a commit, you do TWO things, in order:

1. **Write the code.** Make the change. Run it. Verify it works.
2. **Author the lesson.** Write the corresponding markdown lesson file in `curriculum/module-NN-xxx/lesson-NNN-xxx.md`, using the PE7 Lesson Template, referencing the commit you're about to make.

Then commit both the code AND the lesson in the same commit. The commit message must mention both:

```
feat(tokens): establish OKLCH color palette + lesson 008

- Adds src/lib/styles/tokens.css with full OKLCH palette
- Authors curriculum/module-01-foundation/lesson-008-oklch-palette.md
- Documents PE7 judgment: OKLCH over HSL, why
```

### The mistake log is REAL

When you hit an actual mistake during the build — typo, wrong command, config missed, misunderstood API — log it in the lesson's "Mistake log" section. If you had a smooth build with zero mistakes, invent plausible common mistakes based on your judgment of what an intermediate dev would hit.

### Commit discipline

- Conventional Commits
- One atomic change per commit (code + its lesson)
- Every commit passes `pnpm check && pnpm lint` before moving to the next step
- Never commit `console.log`, `any`, `@ts-ignore`, or hardcoded secrets

### When you must ask

Stop and ask Billy before:
- Swapping any library in the locked stack
- Changing the PE7 Lesson Template structure
- Making the lesson count significantly exceed 170 or fall below 130
- Introducing a third-party service not in the stack

### When you must NOT ask

Proceed without asking for:
- Implementation details (naming, file organization within `src/lib/`, query shape, etc.)
- Styling choices that follow the PE7 tokens
- Test coverage decisions
- Error message copy
- The specific content of "Mistake log" entries (use judgment)
- The specific content of "Alternative X" entries in the Why section (use judgment, but they must be real alternatives a working engineer would consider)

---

## DELIVERABLES

### Code
- Full auth-free ForgeSchool platform, Phases 1–8 complete
- Stripe test-mode integration end-to-end
- WooCommerce-parity product/cart/checkout/coupon/membership/subscription functionality
- Motion-powered marketing site
- Generated icon library via svg-to-svelte
- Svelte Agentation wired in dev
- Playwright E2E for critical paths
- Vitest unit tests for business logic
- GitHub Actions CI
- All 9 documentation `.md` files in `docs/` complete and accurate

### Curriculum
- ~130-170 lesson markdown files under `curriculum/`
- Every lesson follows the PE7 Lesson Template exactly
- Every lesson references a real commit in the repo
- Every lesson's "Why we chose this" contains real alternatives with real failure modes
- Every lesson's "Mistake log" contains real or plausible mistakes

---

## SUCCESS CRITERIA

At the end, these must all be true:

- [ ] `pnpm install` succeeds with pnpm, fails with npm or yarn
- [ ] `pnpm check` reports 0 errors, 0 warnings
- [ ] `pnpm lint` reports 0 errors
- [ ] `pnpm db:reset && pnpm db:seed` completes in under 15 seconds
- [ ] `pnpm dev` starts with zero console errors
- [ ] `pnpm test` passes 100%
- [ ] `pnpm test:e2e` passes 100%
- [ ] Stripe test checkout end-to-end works: `/pricing` → checkout → webhook → entitlement granted
- [ ] Refund flow: Stripe test refund → webhook → entitlement revoked within 1s
- [ ] Lighthouse 95+ on landing, pricing, and a course lesson page
- [ ] `svelte:svelte-autofixer` reports zero issues on every `.svelte` file
- [ ] All 130-170 lesson files present in `curriculum/`
- [ ] Every lesson follows the PE7 Lesson Template (strict structure check)
- [ ] Every lesson's front-matter references a real commit hash in the repo
- [ ] Zero `any`, zero `@ts-ignore`, zero `console.log`, zero hardcoded secrets
- [ ] Motion animations respect `prefers-reduced-motion`
- [ ] Dev routes absent from production bundle

---

## BEGIN

Start with Module 1, Lesson 001.

Report at the end of each MODULE (not each lesson) with:
- Lessons completed this module
- Test status
- Any issues hit and how resolved
- Any PE7 violations identified and fixed

When all 8 modules are complete and every success criterion passes, report:

**"MODULE 8 COMPLETE — FORGESCHOOL PLATFORM AND CURRICULUM READY FOR REVIEW"**
