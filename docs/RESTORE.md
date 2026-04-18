# Backup & restore

## Backup

Postgres production via managed host (Neon, Render, Fly Postgres, Supabase). Every managed host does automated backups — confirm the schedule at setup:

- Daily full snapshots, retained 14 days.
- Point-in-time recovery window ≥ 7 days.

For self-hosted:

```bash
docker exec forgeschool-postgres pg_dump -U forgeschool forgeschool -Fc -f /var/lib/postgresql/backups/$(date +%Y%m%d-%H%M%S).dump
```

Run daily via cron. Keep 14 days on disk + rotate older dumps to S3.

## Restore — dev

```bash
pnpm db:reset        # destructive; local only
pnpm db:seed         # populate from seed-dev
```

## Restore — prod

1. Spin up a fresh managed instance in the same region.
2. Point-in-time restore to the target timestamp via the host's UI.
3. Flip `DATABASE_URL` in Vercel env.
4. Redeploy (or the env change auto-triggers a deploy).
5. Run `pnpm exec drizzle-kit migrate` if the restored instance is behind the codebase.

## What is NOT backed up

- Stripe data lives in Stripe. Reconciliation script (`scripts/reconcile-stripe.ts`) catches the app back up from Stripe on demand.
- User-generated files — none in v1.

## Test restore quarterly

Pick a non-prod DB host, run the restore flow end-to-end, confirm the seeded data shape matches production. Write the date + outcome in `docs/CHANGELOG.md` under "Operations".
