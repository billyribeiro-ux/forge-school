# Deployment

## Targets

v1 ships to Vercel (primary) with Netlify and Node (self-host) as fallbacks. `adapter-auto` picks the right one from the environment.

## Required env vars (production)

```
PUBLIC_APP_URL                "https://forgeschool.dev"
PUBLIC_APP_NAME               "ForgeSchool"
PUBLIC_STRIPE_PUBLISHABLE_KEY "pk_live_..." OR "pk_test_..." per env
STRIPE_SECRET_KEY             "sk_live_..." OR "sk_test_..." per env
STRIPE_WEBHOOK_SECRET         "whsec_..." from dashboard endpoint
DATABASE_URL                  postgres://... (connection-pooled host)
SENTRY_DSN                    optional; enables error capture
PUBLIC_SENTRY_DSN             optional; enables client-side capture
PUBLIC_PLAUSIBLE_DOMAIN       "forgeschool.dev"
LOG_LEVEL                     "info" in prod, "debug" in staging
RESEND_API_KEY                transactional email
RESEND_FROM_EMAIL             "hello@forgeschool.dev"
ENABLE_ADMIN_SHELL            "false" in prod (hard-guarded anyway)
```

## Deploy sequence

1. Merge PR to `main`. CI must be green.
2. Vercel auto-deploys to a preview URL.
3. Review the preview URL end-to-end.
4. Promote via Vercel dashboard (or merge to `production` branch if using the GitOps pattern).
5. Hit `/api/webhooks/stripe` with Stripe's endpoint tester — confirm 200.
6. Tail Sentry for 15 minutes.

## DNS

- Apex + www both resolve to Vercel.
- TLS via Vercel automatic Let's Encrypt.
- `preload-hints` for Stripe's `js.stripe.com` in `app.html` so the checkout button is instant.

## Smoke test (production)

```bash
curl -s https://forgeschool.dev/ | grep -q "ForgeSchool"
curl -sf https://forgeschool.dev/sitemap.xml
curl -sf https://forgeschool.dev/robots.txt
curl -sfo /dev/null -w "%{http_code}\n" https://forgeschool.dev/admin   # expect 404
```
