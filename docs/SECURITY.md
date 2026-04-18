# Security

## Reporting

Email `security@forgeschool.dev`. We acknowledge within 24 hours. We follow a 90-day coordinated-disclosure window.

## Our defaults

- **Cookies**: `httpOnly`, `SameSite=Lax`, `Secure` in prod.
- **Headers**: Strict-Transport-Security, X-Content-Type-Options, Referrer-Policy — set via Vercel's default security headers.
- **Env isolation**: server-only secrets are only accessible via `$env/static/private` (build-time-checked); client code can't read them.
- **Stripe verification**: every webhook request is verified with `stripe.webhooks.constructEvent` + `STRIPE_WEBHOOK_SECRET`. Invalid signature = 400.
- **SQL injection**: all queries via Drizzle's parameterized API. Never `sql.raw` on user input.
- **XSS**: Svelte auto-escapes `{…}` interpolation. `{@html}` is banned in authored templates except inside tightly-controlled markdown rendering paths.

## Things we explicitly don't ship in v1

- Auth. Session cookies are anonymous UUIDs. When a user hits a sensitive surface they get gated by entitlement checks, not by password. A future module series adds Better Auth.
- 2FA / MFA — depends on auth.
- Audit log. Stripe events + pino logs cover the commerce-critical surface.

## Dependencies

- `pnpm audit` runs in CI on a nightly schedule.
- Dependabot PRs for lockfile bumps.
- Major upgrades require a PR with the corresponding lesson added to Module 8 (upgrade-lesson pattern).
