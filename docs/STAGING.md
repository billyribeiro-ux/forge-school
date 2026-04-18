# Staging environment

Vercel preview deployments ARE our staging.

## Per-PR environment

Every PR gets `https://forge-school-git-<branch>.vercel.app/`. Envvars mirror production EXCEPT:

- `STRIPE_SECRET_KEY` uses `sk_test_` keys
- `STRIPE_WEBHOOK_SECRET` is the test-mode webhook secret from the Stripe CLI or a test endpoint
- `DATABASE_URL` points at a staging Postgres (Neon branch, or a shared staging DB)
- `ENABLE_ADMIN_SHELL="false"` (production-identical gate)

## Staging smoke

Before merging:

1. Pull the PR to your local; run `pnpm check && pnpm test && pnpm test:e2e`.
2. Visit the Vercel preview URL — run the critical-path smoke manually.
3. Tail Sentry (if staging DSN set) during the visit; no errors should appear.
