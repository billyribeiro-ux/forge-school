---
number: 29
commit: 4d2c780e56feac2e41eeff0f12cadc79cfb48ed7
slug: curriculum-architecture
title: Design the curriculum folder structure
module: 3
moduleSlug: content-pipeline
moduleTitle: Content Pipeline
phase: 3
step: 1
previous: 28
next: 30
estimatedMinutes: 20
filesTouched:
  - docs/CURRICULUM.md
---

## Context

Module 3 turns the curriculum from "text on disk" into "browsable content served by the app." Before building the loader and the routes, we lock the shape of the data: how modules are folders, how lessons are files, what frontmatter every lesson declares, what body structure every lesson carries. The app's loader will depend on this contract; every lesson author will follow it; every future PR that adds a lesson will be reviewable against it.

This is the first lesson that USES the new frontmatter schema it defines. Look at the top of this file: the `---...---` block is the YAML metadata the loader will parse into a typed `LessonMeta`. Lessons 001-028 don't have this yet — lesson 030 retrofits them. From this lesson forward, every new lesson is authored with frontmatter.

The deliverable is `docs/CURRICULUM.md` — a spec document of similar weight to `docs/ARCHITECTURE.md`. It describes folder naming, file naming, frontmatter schema, body structure, loader contract, URL layout, and authoring rules. It does not implement anything. Implementation is lessons 030 and 031.

## The command

Create `docs/CURRICULUM.md`. Eight sections:

1. **Goals** — three explicit design goals (human-authorable disk layout, self-contained lesson modules, typed metadata).
2. **Disk layout** — the `curriculum/module-NN-<slug>/lesson-NNN-<slug>.md` shape, with folder and file naming rules.
3. **Lesson file structure** — frontmatter + body, followed by the frontmatter schema table (14 keys, types, required/optional) and the seven mandatory H2 body sections in order.
4. **Canonical file validation** — the definition of "well-formed" for a lesson file.
5. **Runtime loader contract** — the exact TypeScript surface `src/lib/server/curriculum/` will export in lesson 031.
6. **URL structure** — `/lessons`, `/lessons/<slug>`, reserved `/modules/<slug>`.
7. **Authoring rules** — voice (second-person plural "we"), code-block fences with language tags, one-commit-per-lesson, no screenshots, no video.
8. **Change log** — dated entries.

Key decisions encoded in the schema:

- **Lesson numbers are globally monotonic** — 001 through ~170, never reset per module. One canonical ID for every lesson.
- **Slug is URL-safe and unique** — the filename's slug segment, the frontmatter `slug`, and the URL all match.
- **Module metadata is duplicated on every lesson** (`module`, `moduleSlug`, `moduleTitle`). A lesson read in isolation must know its module without consulting a separate index file.
- **`previous` / `next` are integers, not slugs.** Slug renames would break the chain silently; numeric references are stable.
- **`filesTouched` is an array, not a prose sentence.** The loader can render it as a clickable list of repo paths; prose cannot.

Verify:

```bash
# Document exists and has the eight sections
wc -l docs/CURRICULUM.md
grep -c "^## " docs/CURRICULUM.md
```
Expected: >200 lines; 8 H2 sections.

## Why we chose this — the PE7 judgment

**Alternative 1: Skip the spec, derive structure from whatever the first implementer writes**
The loader in lesson 031 makes decisions: what frontmatter keys to require, what filenames to accept, what validation to enforce. Without a written spec, those decisions live in code comments that nobody reads. A separate, explicit document is the contract every contributor-and every future lesson author-reads before writing.

**Alternative 2: Use a JSON schema file (`curriculum.schema.json`) instead of prose**
A JSON schema validates frontmatter. It doesn't describe *why* the fields are shaped the way they are, which is half of what CURRICULUM.md does. We might add a JSON schema in Module 8 as part of CI validation — it would complement this doc, not replace it.

**Alternative 3: Put the schema in code (a TypeScript type) and derive the docs from it**
Tempting. The loader will define `type LessonMeta`, and type-first is a PE7 value. In practice, developers read docs before they find the type; the doc's prose explains the *why* a type declaration can't. Keep both; they should agree (lesson 031 imports the types from the doc's schema).

**Alternative 4: Put lessons in the database instead of files**
A `lessons` table with content columns would let Billy edit lessons from an admin UI. It would also forfeit git's diff-based review, forfeit Markdown authoring tools, and create a deployment coupling where updating a typo requires a database migration. Files on disk, tracked in git, is the contract this course is about.

**Alternative 5: Use a content CMS (Sanity, Contentful) with webhook-triggered rebuilds**
Same tradeoff as alternative 4, plus an external-service dependency and an authoring-tool learning curve. For a self-contained course that ships with the app, `curriculum/*.md` wins on every axis except "non-technical editors can author" — which is not a v1 concern for ForgeSchool.

The PE7 choice — Markdown files on disk with YAML frontmatter, validated by a code loader, specified by a committed prose document — wins because it's version-controlled, reviewable, type-safe, and free of external services.

## What could go wrong

**Symptom:** Frontmatter schema changes mid-project; the loader breaks on pre-change lessons
**Cause:** Breaking changes to the frontmatter without a migration plan.
**Fix:** Treat the schema as a versioned API. Add `schemaVersion: 2` to frontmatter when making breaking changes; the loader reads both versions for a transition period. Update this doc's schema table in the same PR that changes the loader.

**Symptom:** Two lessons have the same slug — loader throws "duplicate slug"
**Cause:** A copy-paste authoring mistake when creating a new lesson file.
**Fix:** The loader's validation (lesson 031) detects this at build time. Fix by renaming one of the slugs. Also add a CI check (Module 8) that greps all slugs and fails on duplicates before they land.

**Symptom:** `previous` and `next` form an inconsistent chain — lesson 042 says previous is 40, but 41 says next is 43
**Cause:** A lesson reorder that updated `previous`/`next` inconsistently.
**Fix:** Loader validation detects broken chains. Fix both sides. Consider a script (`scripts/verify-curriculum.ts`) that runs the chain check standalone for pre-commit hooks.

**Symptom:** A lesson file's body has 8 H2 sections (e.g., split "Verify" into "Verify locally" + "Verify in CI")
**Cause:** Author-added section not in the canonical template.
**Fix:** The seven-section contract is strict. Merge the subsections as H3s inside the canonical H2. The PE7 template is the template; deviations are rejected.

## Verify

```bash
# Document exists and is substantive
ls docs/CURRICULUM.md
wc -l docs/CURRICULUM.md
```
Expected: file exists, >200 lines.

```bash
# Eight top-level sections
grep -c "^## " docs/CURRICULUM.md
```
Expected: `8`.

```bash
# Schema documents every field name the loader will read
grep -E '"(number|slug|title|module|moduleSlug|moduleTitle|phase|step|previous|next|estimatedMinutes|filesTouched)"' docs/CURRICULUM.md | wc -l
```
Expected: ≥ 12 (one occurrence per field in the schema table).

```bash
# This lesson itself uses the schema — it has frontmatter
head -1 curriculum/module-03-content-pipeline/lesson-029-curriculum-architecture.md
```
Expected: `---`.

## Mistake log — things that went wrong the first time I did this

- **Proposed YAML frontmatter AND kept the prose header block** (`**Module:** 1 — Foundation`, etc.). Ended up with duplicate metadata — author edits the frontmatter, forgets the prose header; the two drift. Removed the prose header from the template. Frontmatter is the single source of truth; the page renderer (lesson 033) injects a UI header derived from it.
- **Made `previous`/`next` reference slugs instead of numbers.** A slug rename would break every chain-link pointing at the old slug. Switched to numbers — stable IDs. Slug renames still require updating redirects (lesson deferred to Module 6) but no longer corrupt the chain.
- **Let `draft: true` lessons render in the listing by default.** First draft: "draft" was just an indicator, not a gate. Realized a student opening `/lessons` would see half-finished content. Made `draft: true` exclude from listings AND from `previous`/`next` chain computation. If needed for preview, routing via a `/dev/lessons/<slug>` path bypasses the gate.
- **Forgot to reserve `schemaVersion` in the schema.** Looked clean at v1. Three weeks later, a real-world change required a breaking addition. Added `schemaVersion` as optional/implied-1 so future versions have a discriminator without a migration. Rule: every schema reserves its own version field from day one.

## Commit this change

```bash
git add docs/CURRICULUM.md
git add curriculum/module-03-content-pipeline/lesson-029-curriculum-architecture.md
git commit -m "docs(curriculum): design curriculum folder structure + frontmatter schema + lesson 029"
```

With the contract written and this lesson itself serving as the first frontmatter-using example, lesson 030 retrofits every existing lesson with the schema so lesson 031's loader has a uniform corpus to read.
