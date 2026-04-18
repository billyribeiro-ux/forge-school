# Migration safety rules

## The rules

1. **Every migration is one commit.** Generated via `drizzle-kit generate --name <purpose>`.
2. **Never edit a previously-committed migration.** If the change landed, the next migration corrects it.
3. **Add columns nullable first, backfill, then tighten.** Non-null columns on a populated table require a default or a transaction-in-migration pattern.
4. **Drop nothing without a deprecation window.** Dead columns stay for two releases.
5. **Indexes CREATE INDEX CONCURRENTLY on prod.** Drizzle's default blocks writes briefly; CONCURRENTLY is safer for large tables.

## Typical expansions

### Add a nullable column

```sql
ALTER TABLE products ADD COLUMN metadata jsonb;
```

No lock, safe.

### Add a non-null column

```sql
ALTER TABLE products ADD COLUMN kind text NOT NULL DEFAULT 'course';
```

Safe because `DEFAULT` is evaluated per row and Postgres can do it without a full rewrite since PG 11.

### Rename a column

Two-step:

1. Add the new column, backfill from the old one via UPDATE, migrate all writers to the new column.
2. In a later migration, drop the old column.

Never rename in one shot on a populated table.

## Rollback

Drizzle doesn't auto-generate down migrations. If a forward migration breaks:

1. Deploy the reverting SQL as a new forward migration (idempotent: `DROP COLUMN IF EXISTS`, etc.).
2. Never rewind production to a prior migration number — Postgres has no `drizzle_migrations` time machine.
