# Launch checklist

Run top-to-bottom before flipping DNS to production.

## Environment

- [ ] `.env` in Vercel production has every var from `docs/DEPLOYMENT.md#required-env-vars-production`.
- [ ] `STRIPE_SECRET_KEY` starts with `sk_live_` (not `sk_test_`).
- [ ] `PUBLIC_STRIPE_PUBLISHABLE_KEY` starts with `pk_live_`.
- [ ] `ENABLE_ADMIN_SHELL` is `"false"`.
- [ ] `SENTRY_DSN` set, project created, test error visible in Sentry.
- [ ] `PUBLIC_PLAUSIBLE_DOMAIN` matches production domain.

## Stripe

- [ ] Webhook endpoint registered at `https://<domain>/api/webhooks/stripe`.
- [ ] `STRIPE_WEBHOOK_SECRET` matches the production webhook endpoint's secret.
- [ ] Test a one-cent charge through the production Stripe dashboard's "Test webhook event" button.
- [ ] Products mirrored to live mode (the seed targets test mode; live products are created manually or by a live-mode seed run).

## DNS & TLS

- [ ] Apex record → Vercel.
- [ ] `www` → Vercel.
- [ ] HTTPS enforced, no mixed content (scan with `ssllabs.com`).

## Code

- [ ] CI green on `main` for the deploy SHA.
- [ ] `pnpm build` locally clean.
- [ ] `pnpm test` + `pnpm test:e2e` green.
- [ ] No `console.log` / `@ts-ignore` / `any` introduced (grep).

## Legal

- [ ] `/terms`, `/privacy`, `/refund-policy`, `/cookie-notice` all published.
- [ ] Support email (`support@forgeschool.dev`) routing to an actual inbox you read.

## Monitoring

- [ ] Sentry alerts configured (Slack + email on any `error` level).
- [ ] Plausible dashboard open for the first 4 hours.
- [ ] `/api/webhooks/stripe` logs tailed.

## Rollback readiness

- [ ] Last known-good Vercel deployment identified.
- [ ] You know how to promote it (one click).
- [ ] Post-mortem template open in a tab.
