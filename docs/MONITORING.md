# Post-launch monitoring

## Day 0 — the first 4 hours

- Plausible tab open: watch real-time visitors.
- Sentry tab open: alerts route to Slack + email.
- `docker logs -f forgeschool-postgres` (or managed host log tail).
- Check `/api/webhooks/stripe` log count matches Stripe's webhook-delivery dashboard.

## Day 1-7 — the first week

- Sentry issue volume: baseline + regression thresholds.
- Plausible: traffic sources, bounce rate, conversion rate to `/pricing` → purchase.
- Stripe dashboard: net volume, failed payments, disputed-charge volume.
- DB: connection-count peaks, slow-query log.

## SLOs (informal, v1)

- p95 response time < 500ms on cached routes, < 1200ms on dynamic.
- Error budget: ≤ 0.5% of requests 5xx over rolling 24 hours.
- Webhook delivery: 100% eventual success (Stripe retries; we tolerate up to 3 retries on any single event).

## Alert thresholds

- Any `error`-level Sentry event → Slack.
- Sustained 5xx > 1% over 15m → page the on-call.
- Stripe webhook delivery failure > 5 in 1 hour → page.

## Weekly ritual

Every Monday 10am:

1. Review last week's Sentry top issues.
2. Review last week's Plausible funnel: unique visitors, conversion rate.
3. Check `/admin` (local, dev-only) for count drift vs. Stripe.
4. Note any findings in `docs/CHANGELOG.md` under "Operations".
