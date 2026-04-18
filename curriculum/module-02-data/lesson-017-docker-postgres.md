# Lesson 017 — Docker Compose for local Postgres

**Module:** 2 — Data
**Phase:** PE7 Build Order → Phase 2, Step 1
**Previous lesson:** 016 — Validate the foundation and tag the Module 1 checkpoint
**Next lesson:** 018 — Install Drizzle ORM + `drizzle-kit` + `postgres.js`
**Estimated time:** 10 minutes
**Files touched:** `docker-compose.yml`

---

## Context

Module 2 starts the data layer. Before a single Drizzle schema line, before a single `postgres.js` import, we need a running Postgres instance that every developer on the project can spin up the same way with one command. Docker Compose is the universal answer: declare the service in YAML, `docker compose up -d`, the database is up on localhost:5432 with the exact version, user, password, and database name our app expects.

The alternative — asking each contributor to `brew install postgres` / `apt install postgresql-16` — produces version drift (one dev on PG 15, another on PG 17), extension drift (one has `pg_stat_statements`, another doesn't), and environment drift (different `postgresql.conf` defaults). Compose locks all of that into a committed file.

This lesson produces `docker-compose.yml` at the repo root — a single service declaring a Postgres 16 container with the exact credentials and port that `.env.example`'s `DATABASE_URL` references. After this lesson, any machine with Docker Desktop installed can clone the repo and have a running database in 30 seconds.

## The command

Create `docker-compose.yml` at the repo root:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: forgeschool-postgres
    restart: unless-stopped
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: forgeschool
      POSTGRES_PASSWORD: forgeschool
      POSTGRES_DB: forgeschool
      TZ: UTC
      PGTZ: UTC
    volumes:
      - forgeschool_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U forgeschool -d forgeschool']
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s

volumes:
  forgeschool_postgres_data:
    name: forgeschool_postgres_data
```

What each block does:

- **`image: postgres:16-alpine`** — Postgres 16 on Alpine Linux. Alpine is ~75MB vs. ~130MB for the default Debian image. Fewer layers to pull, faster cold starts. Postgres-16-alpine is an officially maintained image — not a community slim.
- **`container_name: forgeschool-postgres`** — Explicit name so `docker ps` output is readable and `docker exec -it forgeschool-postgres psql ...` is typeable. Without this, Compose generates `forgeschool_postgres_1` which is fine but noisy.
- **`restart: unless-stopped`** — If the container crashes or the machine reboots, it restarts. If you intentionally stop it (`docker compose down`), it stays stopped.
- **`ports: '5432:5432'`** — Host port 5432 → container port 5432. Collides if another Postgres is already running locally; see "What could go wrong" below.
- **`POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`** — Match the `DATABASE_URL` in `.env.example`: `postgres://forgeschool:forgeschool@localhost:5432/forgeschool`. Credentials are deliberately trivial because this is local dev; `.env.example` is in the repo.
- **`TZ` / `PGTZ`** — UTC for everything. Application code assumes UTC timestamps. A dev machine running in PST or KST producing local-TZ timestamps causes hard-to-debug "why is this 8 hours off" issues.
- **`volumes: forgeschool_postgres_data`** — Named volume persists data across `docker compose down` / `up`. `docker compose down -v` (with `-v`) deletes the volume — the nuclear reset.
- **`healthcheck`** — `pg_isready` probes every 5 seconds after a 10-second startup grace. Subsequent services (or a CI job) can wait for this health to go green before running migrations.

Bring it up:

```bash
docker compose up -d
```

Verify:

```bash
# Container is running and healthy
docker compose ps
```

Expected: `forgeschool-postgres` with status `running (healthy)`.

```bash
# Postgres accepts connections as the configured user
docker exec forgeschool-postgres pg_isready -U forgeschool -d forgeschool
```

Expected: `/var/run/postgresql:5432 - accepting connections`.

```bash
# Open a psql shell just to prove the credentials work
docker exec -it forgeschool-postgres psql -U forgeschool -d forgeschool -c "SELECT version();"
```

Expected: the Postgres 16 version string.

Stop it when you're done for the day:

```bash
docker compose down
```

(Data persists. `docker compose up -d` next time resumes.)

## Why we chose this — the PE7 judgment

**Alternative 1: Install Postgres natively via Homebrew / apt**
Works. Until you upgrade macOS and `brew upgrade` bumps Postgres from 16 to 17 and your migrations fail because of a syntax change. Until a new contributor joins on Windows and there is no canonical install story. Until CI wants a Postgres that matches dev — at which point you're writing Docker Compose for CI anyway. Start with Compose, inherit the benefits.

**Alternative 2: Use a cloud-managed Postgres (Supabase, Neon, Railway) for local dev**
Works. Until your internet is flaky, your dev server runs offline, the cloud provider has an incident, or you hit the free-tier connection limit. Local Postgres means local iteration. Cloud Postgres is the right answer for preview environments (lesson 133) and production (lesson 134) — not for `pnpm dev` on a laptop.

**Alternative 3: Use SQLite for local dev, Postgres for production**
The "ORM abstracts the database" seduction. It doesn't — SQL dialects diverge in meaningful ways (JSON operators, array types, `RETURNING`, row-level security, full-text search, generated columns). When you develop against SQLite and ship against Postgres, you discover the divergence in production. Dev against Postgres.

**Alternative 4: Use Docker without Compose — a hand-written `docker run` command**
`docker run` works for one container. The moment you add a second service (Redis, a Stripe webhook emulator, a mail catcher) you need Compose anyway. Starting with Compose future-proofs the one-command startup.

**Alternative 5: Use Podman, Colima, or OrbStack instead of Docker Desktop**
All three are valid; all three speak the same `docker compose` CLI. Our `docker-compose.yml` works with any of them. We don't prescribe which runtime to install — the lesson assumes "docker" but the file is runtime-agnostic.

The PE7 choice — Docker Compose + Postgres 16 Alpine + named volume + healthcheck — wins because it produces an identical database across every contributor's machine, every CI run, and every future deployment-to-a-dev-box scenario.

## What could go wrong

**Symptom:** `docker compose up -d` errors with "port is already allocated"
**Cause:** Another Postgres (native install, another Compose project, Postgres.app) is already bound to 5432.
**Fix:** Either stop the other one, or change the host port in `docker-compose.yml` to `'5433:5432'` and update `DATABASE_URL` in `.env.local` to `localhost:5433`. Don't change the container port (`:5432` on the right) — that's the Postgres default and changing it breaks everything inside the container.

**Symptom:** `docker compose ps` shows the service as `running (unhealthy)`
**Cause:** The container is up but Postgres itself hasn't finished initializing, or the healthcheck parameters are too tight.
**Fix:** Wait 10-15 seconds; `start_period: 10s` is a grace before the healthcheck starts reporting. If still unhealthy after a minute, check `docker compose logs postgres` for errors (most common: host volume directory has wrong permissions on Linux).

**Symptom:** `docker compose up -d` hangs pulling the image
**Cause:** First run on this machine; Docker is downloading ~75MB of Postgres image layers.
**Fix:** Wait. Subsequent starts use the cached image and take 2-3 seconds.

**Symptom:** Connection from app fails with `password authentication failed for user "forgeschool"`
**Cause:** The container was created once with a different `POSTGRES_PASSWORD`, the volume persisted, and now the container's startup script won't change the password on an existing database.
**Fix:** `docker compose down -v && docker compose up -d`. The `-v` flag wipes the volume. You lose any seeded data — fine in dev.

**Symptom:** Compose warns about `version: "3.8"` being deprecated
**Cause:** You added a top-level `version:` line copied from an old tutorial. Compose v2+ ignores this field; it's vestigial.
**Fix:** Delete the line. Modern `docker-compose.yml` has no `version:` key — the runtime infers the latest schema.

## Verify

```bash
# File exists
ls docker-compose.yml
```

```bash
# Syntax is valid
docker compose config > /dev/null && echo "valid"
```
Expected: `valid`

```bash
# Service starts, becomes healthy
docker compose up -d
docker compose ps
```
Expected: `forgeschool-postgres` status `running (healthy)` within ~10 seconds.

```bash
# Credentials + port match .env.example DATABASE_URL
docker exec forgeschool-postgres psql -U forgeschool -d forgeschool -c "SELECT current_user, current_database();"
```
Expected: `forgeschool | forgeschool`.

## Mistake log — things that went wrong the first time I did this

- **Forgot `TZ: UTC`.** Seeded data with `now()` timestamps. Tests comparing against hardcoded UTC strings failed on a dev machine in PST because Postgres was defaulting to the host's localtime via libpq's environment inheritance. Added `TZ` and `PGTZ` to the service env, re-seeded, tests passed.
- **Used `postgres:16` (no `-alpine` suffix) originally.** Image was 130MB, pulled slowly on first clone. Switched to `postgres:16-alpine` — same Postgres, ~55MB smaller, same compatibility. No regressions.
- **Omitted the healthcheck, then wrote migration scripts that ran immediately after `docker compose up`.** Scripts raced the Postgres startup and errored with "server closed the connection unexpectedly." Added the healthcheck, updated migration scripts to `docker compose up -d --wait` (or used `pg_isready` in a loop) before running.
- **Set `POSTGRES_PASSWORD: ''` (empty) trying to disable auth for local simplicity.** Postgres refuses to start with empty password for the default user. Set it to `forgeschool` to match the DATABASE_URL — the password is trivial but present.

## Commit this change

```bash
git add docker-compose.yml
git add curriculum/module-02-data/lesson-017-docker-postgres.md
git commit -m "feat(db): add docker-compose for local Postgres 16 + lesson 017"
```

With Postgres running locally, the next lesson installs Drizzle ORM + the `postgres.js` driver, wiring the app to actually talk to the database.
