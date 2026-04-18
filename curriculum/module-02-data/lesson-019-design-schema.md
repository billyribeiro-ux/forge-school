# Lesson 019 — Design the schema on paper first

**Module:** 2 — Data
**Phase:** PE7 Build Order → Phase 2, Step 3
**Previous lesson:** 018 — Install Drizzle ORM + `drizzle-kit` + `postgres.js`
**Next lesson:** 020 — Write the Drizzle schema in `src/lib/server/db/schema.ts`
**Estimated time:** 30 minutes
**Files touched:** `docs/ARCHITECTURE.md`

---

## Context

The most expensive mistakes in a product's first year are schema mistakes. A table shaped wrong in Module 2 produces three `ALTER TABLE` migrations in Module 5 and an emergency data backfill in Module 7. The schema is the one artifact in the codebase where "we'll fix it later" costs orders of magnitude more than "we'll think about it now."

This lesson writes the schema **on paper** — in an architecture document, with entity names, key columns, relationships, and design decisions — before a single `pgTable(...)` call exists in TypeScript. No migration runs from this document. The goal is to force every structural decision through a review that is easy to change: Markdown text. Once the Markdown is right, lesson 020 translates it into Drizzle code and lesson 021 generates the migration.

The document produced here is `docs/ARCHITECTURE.md`. It goes in the same `docs/` directory as `SPEC.md` — together they form the repo's two-document contract: SPEC says *what* the product does, ARCHITECTURE says *how* the system is shaped.

## The command

Create `docs/ARCHITECTURE.md`. It covers nine sections:

1. **Scope** — what this document governs and how it relates to `SPEC.md`.
2. **Runtime topology** — the SvelteKit app + external services (Postgres, Stripe, Resend, Sentry, Plausible).
3. **Source tree** — the `src/` layout with server/client partition notes.
4. **Data model — entity overview** — the full list of v1 tables, field-by-field. This is the largest section.
5. **Route architecture** — the URL → handler map.
6. **Security boundaries** — server vs. client, secrets, CSRF, webhook signatures, entitlement checks.
7. **Observability** — pino, Sentry, Plausible, Drizzle Studio.
8. **Out of scope for v1** — auth, multi-tenant, i18n, video, realtime, admin UI.
9. **Change log** — timestamped entries as the document evolves.

The data-model section (§4) lists **13 tables** in v1, grouped by boundary:

- **Catalog** — `products`, `prices`, `product_categories`, `product_category_memberships`
- **Commerce** — `orders`, `order_items`, `payments`, `refunds`, `subscriptions`
- **Access** — `entitlements`
- **Promotions** — `coupons`, `coupon_redemptions`
- **Sessions** — `carts`, `cart_items`
- **Integrity** — `webhook_events` (Stripe idempotency)

Each table's section lists primary key, foreign keys, unique constraints, enums, and the key non-trivial columns. The doc does NOT list every column type annotation — those live in the Drizzle schema (lesson 020). The doc captures the *shape* and the *why*.

Include eight explicit **design decisions** in §4.3, each a short paragraph explaining why the choice was made and what it prevents:

1. **`session_id` as the universal principal in v1** — auth-free v1 means no `users` table; every commerce table keys off an opaque cookie. Auth migration adds a nullable `user_id` later.
2. **Cents everywhere, never floats** — every money column is `integer` in minor units. Float math on money is forbidden.
3. **Stripe IDs as unique constraints** — every mirrored Stripe object has a unique index on its Stripe ID. This is the key webhooks look up on.
4. **Entitlements are the grant truth, not orders** — client code checks `entitlements`, never `orders`. The webhook grants; the success URL only acknowledges.
5. **`webhook_events` as idempotency ledger** — `ON CONFLICT (stripe_event_id) DO NOTHING` means duplicate deliveries are free no-ops.
6. **Soft deletes only where audit matters** — `entitlements.revoked_at` is nullable soft-delete. Carts, webhook events can be hard-deleted.
7. **`updated_at` on mutable rows only** — append-only tables (payments, refunds) have only `created_at`.
8. **Timestamps in `timestamptz`** — UTC in the database, local in the client.

Also document **indexes beyond PKs** — specifically the ones that gate hot query paths: `products (status, kind)`, `prices (product_id, active)`, `orders (session_id, created_at desc)`, `entitlements (session_id, revoked_at)`, etc. These land as `index(...)` declarations in lesson 020's schema.

## Why we chose this — the PE7 judgment

**Alternative 1: Skip the doc, write the Drizzle schema directly**
Defensible for a 5-table app. ForgeSchool's schema has 13 tables and multiple design decisions (grant model, idempotency, auth-free session handling) that would be invisible in the `schema.ts` file. A schema file shows shape; it doesn't show *why*. The architecture doc captures why. In six months, when you're questioning why `entitlements.source` is an enum and not a free-text field, the doc is the answer.

**Alternative 2: Use a diagramming tool (Mermaid, PlantUML, dbdiagram.io)**
Diagrams are excellent for communicating with stakeholders. They are not authoritative — the Drizzle schema is. A diagram drifts from reality the moment someone edits `schema.ts` without updating the diagram. Markdown text next to prose is grep-able, diffable in git, reviewable in PRs. Add a Mermaid diagram later if you want a visual; the text-based doc is the source of truth.

**Alternative 3: Design the schema by iterating on the migrations**
"Start with a minimal schema; add columns via migration as needed." Works for append-only additions. Breaks for structural changes (splitting a column into two, renaming a foreign-key relationship, changing the grant model). By designing the full shape upfront, we avoid the class of migrations that destructure the data into a different shape — those are the expensive ones.

**Alternative 4: Put the schema design in a Notion / Linear document**
External docs drift from the repo. Architecture in a git-tracked markdown file ages with the codebase; it's updated in the same PR that changes the schema. The blast radius of drift is confined to "the doc is wrong" — which a PR reviewer catches — not "the doc and the codebase disagree silently and nobody noticed for three weeks."

**Alternative 5: Skip v1 entitlement-vs-order separation; grant on checkout success**
Shortcut: the success URL marks the order as "access granted" and skips the webhook grant. This is the #1 way to ship a paid product that blocks users randomly — because the success URL can fire without a payment actually succeeding (abandoned carts, network failures, Stripe async flows). The webhook is the only source of truth for "did the money move." The doc bakes this in, so every future contributor who is tempted to shortcut the grant path reads the rule first.

The PE7 choice — a comprehensive architecture document — wins because it externalizes design decisions into a diff-able, review-able, version-controlled artifact that the schema file alone cannot carry.

## What could go wrong

**Symptom:** The architecture doc drifts from the schema file within weeks
**Cause:** Contributors edit `schema.ts` without updating `ARCHITECTURE.md`.
**Fix:** Add a PR-template checklist item: "If this PR changes the schema, did you update `docs/ARCHITECTURE.md`?" Enforce in review. For automated enforcement: a CI check that fails if `src/lib/server/db/schema.ts` changes without a corresponding diff in `docs/ARCHITECTURE.md`. Added in Module 8.

**Symptom:** An architecture decision made in this doc turns out wrong in Module 5
**Cause:** You were working with incomplete information. That's normal.
**Fix:** Update the doc in the same PR that corrects the schema. The change log at §9 records the revision with a date and a one-sentence summary. The doc evolves; it doesn't ossify.

**Symptom:** A new contributor reads `schema.ts` and has no idea why a table is shaped the way it is
**Cause:** The schema file has zero comments about design intent — deliberately, because intent lives in the architecture doc.
**Fix:** Cross-reference. In `schema.ts`, a brief header comment points readers at `docs/ARCHITECTURE.md §4`. The file itself stays lean; the doc carries the prose.

**Symptom:** The doc's "Out of scope for v1" list grows every week
**Cause:** "Out of scope" is where future-maybe features go to die. Some belong in the backlog, not in the architecture doc.
**Fix:** Prune §8 periodically. If an item is no longer being actively considered, delete it. The doc should reflect current-as-of-now reality, not every deferred idea ever floated.

## Verify

```bash
# Doc exists and is non-trivial
wc -l docs/ARCHITECTURE.md
```

Expected: at least 200 lines (detail, not a stub).

```bash
# Nine sections present
grep -c '^## ' docs/ARCHITECTURE.md
```

Expected: `9`.

```bash
# All 13 v1 tables mentioned
for t in products prices product_categories product_category_memberships \
         orders order_items payments refunds subscriptions \
         entitlements coupons coupon_redemptions carts cart_items webhook_events; do
  grep -q "$t" docs/ARCHITECTURE.md && echo "found $t" || echo "MISSING $t"
done
```

Expected: one `found ...` line per table.

## Mistake log — things that went wrong the first time I did this

- **Listed every column's type in the doc.** Ended up with 400 lines of `text not null` annotations that duplicated what the Drizzle schema would express better. Cut the column-level detail back to *key fields* (primary keys, foreign keys, uniques, enums, non-trivial constraints). The rest lives in the schema file.
- **Forgot to document the entitlements-vs-orders grant model.** First draft described both tables independently. A reviewer (future me) asked "so which one decides whether the user can access the course?" — realized the rule needed its own paragraph in §4.3. Added. This single rule is the most important structural decision in the whole document.
- **Tried to draw the ERD as ASCII art.** Looked ridiculous at 14 tables. Switched to a terse textual form:
  ```
  orders 1 ───< order_items ───> prices
  ```
  Readable, greppable, no alignment headaches. A proper diagram can be added to §4.2 as a future nicety; for now, text serves.
- **Skipped the Change log section.** Added later when I realized the doc would evolve and future readers would want to see what changed when. Added §9 with the initial entry dated today.

## Commit this change

```bash
git add docs/ARCHITECTURE.md
git add curriculum/module-02-data/lesson-019-design-schema.md
git commit -m "docs(architecture): design the v1 data model + lesson 019"
```

Documented. Reviewed by the one reviewer in the room (us). Lesson 020 translates the 13 tables into Drizzle code — every table, every relation, every index, in a single typed file.
