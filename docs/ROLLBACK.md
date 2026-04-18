# Rollback procedure

## Code rollback

**Vercel:** Dashboard → Deployments → find the last known-good deployment → "Promote to production." Instant.

**Self-host (Node adapter):** Redeploy the last known-good git SHA:

```bash
git checkout <last-good-sha>
pnpm install --frozen-lockfile
pnpm build
pm2 restart forgeschool
```

## DB rollback

DO NOT run a reverse migration. Instead:

1. Deploy a new forward migration that un-does the problematic change.
2. If data integrity is compromised, pursue point-in-time restore (see `docs/RESTORE.md`).

## When to rollback (decision tree)

- **Bug reported, no data impact, fix ready in < 1 hour** → hotfix forward, don't rollback.
- **Bug causing checkout failures / payment-path errors** → rollback code immediately, fix forward in staging.
- **DB migration breaking reads** → deploy reverting migration; don't time-travel the DB.
- **Secrets leaked** → rotate secret, code-push, no rollback.

## After any rollback

1. Open a post-mortem doc (template in `docs/INCIDENT_RESPONSE.md`).
2. Add a regression test.
3. Ship the fix forward in a new PR.
