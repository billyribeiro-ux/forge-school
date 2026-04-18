---
number: 80
slug: course-index
title: Entitlement-gated course index at /course
module: 5
moduleSlug: product
moduleTitle: Product
phase: 5
step: 18
previous: 79
next: null
estimatedMinutes: 15
filesTouched:
  - src/lib/server/db/queries.ts
  - src/routes/course/+page.server.ts
  - src/routes/course/+page.svelte
---

## Context

The customer-facing course has rows in Postgres (lesson 079) but no route yet. This lesson stands up `/course` — the student's home for the course — and hangs the first entitlement gate off it. Unauthenticated or un-entitled visitors see a short upgrade prompt that deep-links into the product detail page; entitled visitors see the module list.

The gate is inline HTML in the route, not a shared component, on purpose. The `UpgradePrompt` component planned for lesson 076 can be wired in later — this lesson focuses on the gating plumbing, not the polish. Keeping the dependencies narrow keeps the commit atomic.

Session identity comes from the `forge_session` cookie via `ensureSessionCookie` (the same helper every commerce-adjacent surface uses). No auth yet.

## The command

`src/lib/server/db/queries.ts` — add the session-scoped entitlements read:

```ts
export async function getUserEntitlements(
  db: Db,
  sessionId: string
): Promise<Entitlement[]> {
  return db
    .select()
    .from(entitlements)
    .where(and(eq(entitlements.sessionId, sessionId), isNull(entitlements.revokedAt)));
}
```

Also add `listCourseModulesByProductSlug(db, productSlug)` — a LEFT JOIN from `course_modules` to `course_lessons` with a `count(lessons.id)::int` that returns each module annotated with its `lessonCount`, ordered by `orderIndex`.

`src/routes/course/+page.server.ts`:

```ts
export const load = async ({ cookies }) => {
  const sessionId = ensureSessionCookie(cookies);
  const entitled = await hasEntitlement(db, {
    sessionId,
    productSlug: 'forgeschool-lifetime'
  });
  if (!entitled) {
    return { entitled: false as const, productSlug: 'forgeschool-lifetime' };
  }
  const modules = await listCourseModulesByProductSlug(db, 'forgeschool-lifetime');
  return { entitled: true as const, modules };
};
```

`src/routes/course/+page.svelte` renders a discriminated union on `data.entitled`:
- `false` → gate card with headline, body, CTA linking `/products/forgeschool-lifetime`.
- `true` → `<ol>` of modules, each row an `<a>` to `/course/{slug}` with index, title, and lesson count.

```bash
pnpm check
pnpm dev   # visit /course — gate renders
# Then grant yourself a manual entitlement in psql:
psql "$DATABASE_URL" -c "\
  insert into entitlements (session_id, product_id, source, source_ref) \
  select '<your-session-cookie-value>', id, 'grant', 'manual-dev' from products where slug='forgeschool-lifetime';"
# Reload /course — module list renders.
```

## Why we chose this — the PE7 judgment

**Alternative 1: Put the gate in `hooks.server.ts`.**
A route-level hook gate has to know every protected path up front and turns into a long `if (event.url.pathname.startsWith(...))` tree. The hook is the right place for cross-cutting concerns (logging, tracing, the session cookie itself); the entitlement decision belongs next to the view it guards.

**Alternative 2: Check entitlement client-side after load.**
Every gated page would ship the full content to the browser and then hide it with CSS. Any competent dev-tools user bypasses the gate. The gate runs on the server.

**Alternative 3: Use the `UpgradePrompt` component from lesson 076 as the gate body.**
The component does not exist when this lesson runs (we are building sequentially). Deferring the component dependency keeps this commit self-contained; wiring the component happens cleanly in a later lesson without rewriting the gate logic.

**Alternative 4: Use a discriminated union `{ entitled: false } | { entitled: true, modules }` vs. always returning `modules`.**
Returning `modules: []` to un-entitled users forces the template to distinguish empty-catalog-because-empty from empty-catalog-because-gated. The discriminated union makes the states explicit at the type layer and the template mirrors them cleanly.

The PE7 choice — server-side gate, route-local, typed discriminated return — wins on type-safety, server-authority, and commit atomicity.

## What could go wrong

**Symptom:** Gate renders even after the seed grants an entitlement
**Cause:** The `entitlements` row ties `session_id` to a cookie value — your browser's `forge_session` does not match the one you typed into psql.
**Fix:** Read the cookie value in dev-tools first, then insert the row with that session id.

**Symptom:** `pnpm check` fails on `{ entitled: false as const, ... }`
**Cause:** Missing `as const` narrows the literal to `boolean` and the template's `{#if !data.entitled}` cannot then access the un-entitled-only field.
**Fix:** Annotate `false as const` / `true as const` on both branches.

**Symptom:** `listCourseModulesByProductSlug` returns `[]` even though rows exist
**Cause:** The LEFT JOIN condition used `courseModules.productId = products.slug` by mistake.
**Fix:** Join modules to products via `products.id`, filter `products.slug`.

## Verify

```bash
pnpm check
pnpm dev
curl -s -I http://localhost:5173/course | head -n 1    # 200
curl -s http://localhost:5173/course | grep -q "Lifetime"   # gate visible pre-grant
```

## Mistake log

- **Forgot to import `ensureSessionCookie` from `$lib/server/session` and used `cookies.get('forge_session')` directly.** Worked for returning visitors, blew up for first-time ones. `ensureSessionCookie` is the single source of truth — always use it.
- **Rendered `<a href="/course/{mod.slug}">` as a literal template string in error** — Svelte interpolates `{mod.slug}` fine inside attribute values, but a copy-paste put it inside a `${...}` template literal that never evaluated.
- **Used `listEntitlementsForSession` in the index page load.** That query exists already in `src/lib/server/entitlements/index.ts`; the new `getUserEntitlements` in `queries.ts` is the canonical query-layer name used going forward. Standardizing on one removed the naming ambiguity.

## Commit

```bash
git add src/lib/server/db/queries.ts src/routes/course/+page.server.ts src/routes/course/+page.svelte
git add curriculum/module-05-product/lesson-080-course-index.md
git commit -m "feat(routes): entitlement-gated /course index + lesson 080"
```

Gate is up. Next we render a single module's lessons.
