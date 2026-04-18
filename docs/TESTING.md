# Testing strategy

## Layers

- **Unit (Vitest)** — pure functions: cart math, coupons, tier derivation. Zero DB.
- **Integration (Vitest + live Postgres)** — Drizzle queries against a local DB. Opt-in via `pnpm db:reset && pnpm db:seed` first.
- **E2E (Playwright)** — full browser, against `pnpm build && preview`. Stripe redirects verified at the `checkout.stripe.com` boundary.

## Running locally

```bash
pnpm test               # all unit tests
pnpm test:e2e           # Playwright (assumes docker-compose up for Postgres)
pnpm exec vitest run    # explicit
pnpm exec playwright test tests/e2e/critical-path.spec.ts
```

## What CI runs

- Every push + PR: typecheck, lint, unit, build, E2E critical-path.
- Stripe-hitting E2Es (lessons 058-060) run ONLY when `STRIPE_SECRET_KEY` is valid — they're skipped on forks without secrets.

## Flake policy

- Retries in CI: 2 (via `playwright.config.ts`).
- Retries locally: 0.
- A test that flakes twice in a week moves to the quarantine folder + an issue is opened.

## Coverage

No enforced coverage threshold. Instead: every bug fix ships with a regression test. If you break something, the next PR adds the test that would have caught it.
