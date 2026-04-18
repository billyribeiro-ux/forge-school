# Lesson 018 — Install Drizzle ORM, drizzle-kit, and postgres.js

**Module:** 2 — Data
**Phase:** PE7 Build Order → Phase 2, Step 2
**Previous lesson:** 017 — Docker Compose for local Postgres
**Next lesson:** 019 — Design the schema on paper (`docs/ARCHITECTURE.md`)
**Estimated time:** 15 minutes
**Files touched:** `package.json`, `pnpm-lock.yaml`, `drizzle.config.ts`, `src/lib/server/db/index.ts`, `src/lib/server/db/schema.ts`

---

## Context

Drizzle ORM is our database layer. It is type-safe (every query returns a typed result without code generation hacks), close-to-SQL (it reads as SQL, not as a Ruby ActiveRecord-style builder), and headless (no global state, no singletons other than the ones you wire). Combined with `postgres.js` as the driver and `drizzle-kit` for migrations, Drizzle gives us a full-stack type signal from `schema.ts` all the way into Svelte load functions.

We install three packages in this lesson, wire the Drizzle client to the running Postgres instance from lesson 017, and create a stub schema file that lesson 020 will fill with real tables. We also author `drizzle.config.ts` at the repo root — the config `drizzle-kit generate`, `drizzle-kit migrate`, and `drizzle-kit studio` all read.

No migrations run yet. That's lesson 021-022. This lesson is wiring.

## The command

Install the three Drizzle packages:

```bash
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit dotenv
```

- **`drizzle-orm`** (runtime) — the query builder + schema primitives (`pgTable`, `text`, `integer`, `timestamp`, etc.).
- **`postgres`** (runtime) — the [postgres.js](https://github.com/porsager/postgres) driver, widely considered the fastest Postgres driver for Node.
- **`drizzle-kit`** (dev) — the CLI that generates migrations, applies them, and launches Drizzle Studio.
- **`dotenv`** (dev) — lets `drizzle.config.ts` read `.env.local` when invoked from the shell (outside SvelteKit's `$env` runtime).

Create `drizzle.config.ts` at the repo root:

```ts
import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined || databaseUrl === '') {
  throw new Error(
    'DATABASE_URL is not set. Copy .env.example to .env.local and fill it in before running drizzle-kit.'
  );
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/server/db/schema.ts',
  out: './drizzle/migrations',
  dbCredentials: { url: databaseUrl },
  strict: true,
  verbose: true
});
```

- **`dialect: 'postgresql'`** — distinguishes from MySQL / SQLite. Must match the driver.
- **`schema`** — path to the Drizzle table declarations. Single source of truth.
- **`out`** — where migration SQL and snapshot JSON get written.
- **`dbCredentials.url`** — read from env; the throw above guarantees we never silently connect to the wrong database.
- **`strict: true`** — drizzle-kit asks for confirmation before any destructive migration (dropped columns, dropped tables).
- **`verbose: true`** — prints the generated SQL so you can review what's about to run.

Create `src/lib/server/db/schema.ts` as a stub (tables ship in lesson 020):

```ts
export {};
```

The `export {}` turns the file into an ES module; `drizzle-kit` and TypeScript both treat empty-body files correctly when they're valid modules.

Create `src/lib/server/db/index.ts` — the singleton client the rest of the app imports:

```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DATABASE_URL } from '$env/static/private';
import * as schema from './schema.ts';

if (DATABASE_URL === '') {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.');
}

const client = postgres(DATABASE_URL, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
  prepare: false
});

export const db = drizzle(client, { schema, logger: false });

export type Db = typeof db;
```

What each client option does:

- **`max: 10`** — connection pool ceiling. A single local dev server doesn't need more than this; in prod this flexes up via env if needed.
- **`idle_timeout: 30`** — idle connections drop after 30 seconds. Prevents accumulation in long-running dev sessions.
- **`connect_timeout: 10`** — fail fast on a dead database rather than hanging a request.
- **`prepare: false`** — postgres.js prepares statements by default; Supabase connection-pool mode and some bouncer configurations don't support prepared statements cleanly. We set `false` now so the local dev path matches the prod path once we deploy to a pooled environment. If we later add pgBouncer/Supabase, zero changes are needed here.

Verify TypeScript is happy:

```bash
pnpm check
```

Expected: 0 errors. The file count jumps significantly (to ~475 FILES) because Drizzle's type surface is large — all those type-check lines are Drizzle's generic type machinery being traversed by `svelte-check`. Zero errors is the bar.

## Why we chose this — the PE7 judgment

**Alternative 1: Prisma**
Prisma is the most popular Node ORM. Two structural concerns steered us away for this project. First, Prisma requires a code-generation step (`prisma generate`) that emits a `@prisma/client` package into `node_modules`; every schema change requires re-generation, and diffs of the generated client don't belong in git. Drizzle derives types from the schema file at TypeScript compile time — no generated artifacts, no sync-drift risk. Second, Prisma Client is a runtime package (~5MB minified) that ships with every app; Drizzle's runtime is a thin query builder (~30KB). For a lean serverless/edge build, Drizzle is materially smaller.

**Alternative 2: Kysely**
Kysely is excellent — type-safe, query-builder-style, no codegen. It's our second-best choice by a narrow margin. Drizzle's advantage: the schema file is the source of truth for both types AND migration generation, so a single edit propagates to both the type system and the DB. Kysely requires a separate migration tool (kysely-codegen or hand-written migration files). Drizzle's `drizzle-kit generate` reads the same schema and emits SQL — one file, two consumers.

**Alternative 3: Raw SQL via `postgres.js` with hand-authored types**
The zero-ORM approach: write SQL strings, type the return values by hand, use postgres.js. Works for tiny apps. Scales badly — every new query means two edits (SQL + type), and a schema change means hand-editing every type that touches the affected column. Drizzle automates this without sacrificing the close-to-SQL feel.

**Alternative 4: TypeORM**
TypeORM has significant architectural debt (active Discord full of bug reports, decorator-based model approach that fights TypeScript's current design). The PostgreSQL ecosystem has largely moved past TypeORM in 2024-2026.

**Alternative 5: pg (node-postgres) instead of postgres.js**
`pg` is the veteran Node Postgres driver — stable, widely deployed. `postgres.js` is newer, faster in most benchmarks, and has a cleaner API for async iteration and streaming. Drizzle supports both via different entry points (`drizzle-orm/node-postgres` vs `drizzle-orm/postgres-js`). We pick postgres.js for the speed and API; both are solid.

The PE7 choice — Drizzle + postgres.js + drizzle-kit + dotenv — wins because the schema file is a single source of truth, the runtime is small, types flow end-to-end without codegen, and the tool chain is stable in 2026.

## What could go wrong

**Symptom:** `pnpm check` errors with `Cannot find module '$env/static/private'` when touching `src/lib/server/db/index.ts`
**Cause:** `.svelte-kit/ambient.d.ts` hasn't been regenerated since `DATABASE_URL` was added to env — or the env file isn't actually being loaded.
**Fix:** `pnpm exec svelte-kit sync` regenerates the ambient types from `.env.example`. Confirm `DATABASE_URL` is declared in `.env.example` (it is, from lesson 006).

**Symptom:** `drizzle-kit generate` errors with `DATABASE_URL is not set`
**Cause:** `drizzle.config.ts` runs outside SvelteKit, so `$env/static/private` isn't available — it reads `process.env.DATABASE_URL` via dotenv.
**Fix:** Verify `.env.local` exists in the repo root and has `DATABASE_URL="postgres://..."` set. If you're running drizzle-kit from a subdirectory, cd back to the repo root first.

**Symptom:** The schema file (`src/lib/server/db/schema.ts`) exports nothing, and Drizzle complains
**Cause:** An empty file is not a module in TypeScript. Without `export {}`, the file is treated as a global script and can't be imported.
**Fix:** Keep `export {}` until real tables are added in lesson 020.

**Symptom:** Prepared statements errors on staging/production but not local
**Cause:** We set `prepare: false` — but a subsequent contributor removed it, and prod runs through pgBouncer or Supabase in transaction mode, which doesn't support prepared statements across pool connections.
**Fix:** Keep `prepare: false`. If a benchmark suggests prepared statements would help, confirm the prod environment supports them (Supabase session mode, direct Postgres, etc.) before flipping.

## Verify

```bash
# Packages installed with the expected versions
grep -E '"drizzle-orm"|"postgres"|"drizzle-kit"|"dotenv"' package.json
```
Expected: four lines listing the packages.

```bash
# Config file exists and parses as valid TS
ls drizzle.config.ts
pnpm exec tsc --noEmit drizzle.config.ts
```
Expected: config file exists; `tsc` returns no output (success).

```bash
# Client and schema stubs exist
ls src/lib/server/db/index.ts src/lib/server/db/schema.ts
```

```bash
# Types still pass
pnpm check
```
Expected: 0 errors.

```bash
# drizzle-kit can introspect the config
pnpm exec drizzle-kit generate --help | head -3
```
Expected: help text prints, proving drizzle-kit CLI is resolvable.

## Mistake log — things that went wrong the first time I did this

- **Imported from `./schema` without the `.ts` extension.** `tsconfig.json` has `rewriteRelativeImportExtensions: true`, which means relative imports MUST include the `.ts` extension so the compiler can rewrite them for emit. First pass was `import * as schema from './schema'` and TypeScript errored. Fixed to `import * as schema from './schema.ts'` — aligns with the PE7 tsconfig.
- **Tried to put `drizzle.config.ts` inside `src/`.** drizzle-kit looks at the repo root by default. Moving it to `src/drizzle.config.ts` broke the CLI discovery. Put it at root, move on.
- **Used `postgres.js` in connection-string mode with `ssl: 'require'` set.** Fine for prod, breaks local dev against a Docker Postgres with no TLS. Removed the hardcoded `ssl` option; let the connection string decide (our dev URL has no `sslmode=` suffix, so no TLS negotiated).
- **Wrote `drizzle(client, { schema })` without `logger: false`.** Every query printed SQL to stdout during dev, drowning out pino output. Turned logger off — we'll surface SQL via pino integration in a later lesson when needed for debugging.

## Commit this change

```bash
git add package.json pnpm-lock.yaml drizzle.config.ts src/lib/server/db/index.ts src/lib/server/db/schema.ts
git add curriculum/module-02-data/lesson-018-install-drizzle.md
git commit -m "feat(db): install Drizzle ORM + postgres.js + drizzle-kit + lesson 018"
```

With Drizzle wired and the stub schema in place, lesson 019 designs the data model before we write a single table — the rare discipline that saves weeks of rework in the Stripe + membership phases.
