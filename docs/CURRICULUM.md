# ForgeSchool — Curriculum Architecture

**Version:** 1.0.0
**Last updated:** 2026-04-18
**Scope:** How the curriculum is structured on disk, how each lesson is shaped, and how the SvelteKit runtime consumes it.

---

## 1. Goals

The curriculum is both the **product** (what students consume) and the **corpus** (raw data the app loads and renders). Three design goals constrain the shape:

1. **Disk layout is human-authorable.** A contributor opening `curriculum/` in a file tree must see a legible structure — modules as folders, lessons as files, in natural order.
2. **Every lesson is a self-contained module** — TypeScript-import-able as a compiled Svelte component via mdsvex. No cross-file references; no fragments included from elsewhere.
3. **Metadata is typed.** Every lesson declares its position (number, module, previous, next, estimated time, files touched) in YAML frontmatter that the loader parses into a typed `LessonMeta` object. No regex-scraping of prose.

The loader reads every lesson at build time via Vite's `import.meta.glob`, produces a typed table-of-contents, and exposes typed query functions (`listModules`, `getModule`, `getLesson`) that routes consume.

## 2. Disk layout

```
curriculum/
├── module-01-foundation/
│   ├── lesson-001-spec-the-product.md
│   ├── lesson-002-create-project-folder.md
│   ├── lesson-003-scaffold-sveltekit.md
│   ├── ...
│   └── lesson-016-module-1-checkpoint.md
├── module-02-data/
│   ├── lesson-017-docker-postgres.md
│   ├── ...
│   └── lesson-028-module-2-checkpoint.md
├── module-03-content-pipeline/
│   └── ...
└── ... (modules 04 through 08)
```

### 2.1 Folder naming

Every module folder follows the pattern:

```
module-NN-<kebab-slug>/
```

- **`NN`** — two-digit module number, zero-padded. `01` through `08` in v1. Zero-padding ensures filesystem sort order matches semantic order.
- **`<kebab-slug>`** — short, lowercase, hyphen-separated title. Examples: `foundation`, `data`, `content-pipeline`, `money`, `product`, `marketing`, `polish`, `ship`. The slug appears in URLs and must be URL-safe.

### 2.2 File naming

Every lesson file follows:

```
lesson-NNN-<kebab-slug>.md
```

- **`NNN`** — three-digit lesson number, zero-padded, continuous across modules. Lessons 001-016 are Module 1; 017-028 are Module 2; etc. Never reset per module. This single monotonic counter is the canonical lesson identifier.
- **`<kebab-slug>`** — short hyphenated title. Unique within the project. The lesson's URL uses this slug (not the number).

Examples:
- `lesson-003-scaffold-sveltekit.md` — URL `/lessons/scaffold-sveltekit`.
- `lesson-020-write-drizzle-schema.md` — URL `/lessons/write-drizzle-schema`.

### 2.3 Why slug in URLs, number in filenames

Filenames sort by number. URLs read by slug. The dual addressing lets:

- A filesystem view (`ls curriculum/module-02-data/`) communicate chronology immediately.
- A user's browser bookmark (`/lessons/drizzle-schema`) remain stable if lesson numbers shift during final ordering.

If a lesson slug changes, we record a redirect (Module 6 wires SvelteKit's `handleRedirect` for stable permalinks).

## 3. Lesson file structure

Every lesson is a Markdown file with YAML frontmatter followed by body prose written in the PE7 Lesson Template.

```markdown
---
number: 3
slug: scaffold-sveltekit
title: Scaffold the SvelteKit project
module: 1
moduleSlug: foundation
moduleTitle: Foundation
phase: 1
step: 3
previous: 2
next: 4
estimatedMinutes: 10
filesTouched:
  - package.json
  - svelte.config.js
  - src/app.html
---

## Context

[body prose here — Context, The command, Why we chose this,
 What could go wrong, Verify, Mistake log, Commit this change]
```

### 3.1 Frontmatter schema

| Key | Type | Required | Description |
|---|---|---|---|
| `number` | integer | yes | Globally-unique lesson number (001, 002, ..., 170). Matches filename. |
| `slug` | string | yes | URL-safe identifier. Matches filename suffix. Globally unique. |
| `title` | string | yes | Human-readable lesson title. Rendered as the page `<h1>`. |
| `module` | integer | yes | Module number (1-8). |
| `moduleSlug` | string | yes | Module folder slug (without the `module-NN-` prefix). |
| `moduleTitle` | string | yes | Human-readable module title. |
| `phase` | integer | yes | Matches `module` in v1. Reserved to allow future mid-module restructuring. |
| `step` | integer | yes | Lesson's position within its module (1-indexed). |
| `previous` | integer \| null | yes | Previous lesson number. `null` for lesson 001. |
| `next` | integer \| null | yes | Next lesson number. `null` for the final lesson. |
| `estimatedMinutes` | integer | yes | Rough student-time-to-complete. |
| `filesTouched` | string[] | yes | File paths this lesson adds or modifies. Empty array for doc-only lessons. |
| `draft` | boolean | no | If `true`, lesson is excluded from production listings and indexing. Default `false`. |
| `commit` | string | no | Git commit hash that landed this lesson. Backfilled by a release script. |

### 3.2 Body structure — the PE7 Lesson Template

Every lesson's body contains **exactly** these H2 sections, in this order:

1. **Context** — 2-4 paragraphs. Why this step exists; what breaks if skipped.
2. **The command** — exact commands and exact file contents. No hand-waving.
3. **Why we chose this — the PE7 judgment** — 3-5 real alternatives with real failure modes.
4. **What could go wrong** — 2-4 concrete symptom / cause / fix entries.
5. **Verify** — commands that prove the state is correct.
6. **Mistake log — things that went wrong the first time I did this** — 3-4 real or plausible mistakes.
7. **Commit this change** — the exact `git add` + `git commit` invocation.

No other H2 sections. Sub-sections inside the above (H3) are permitted and encouraged for Verify and Mistake log.

## 4. Canonical file validation

A lesson is "well-formed" when:

- Filename matches `lesson-NNN-<slug>.md`.
- Frontmatter has every required key.
- Frontmatter `number` matches the `NNN` in the filename.
- Frontmatter `slug` matches the slug segment of the filename.
- Body contains the seven H2 sections in order.
- `previous` and `next` form a valid chain (checked across the full curriculum).

Validation is enforced at loader time (lesson 031). A well-formed frontmatter but a body missing a required section produces a build-time error, not a silent render.

## 5. Runtime loader contract

The loader lives in `src/lib/server/curriculum/` and exposes:

```ts
export type LessonMeta = { /* as above */ };
export type LessonModule = { /* Svelte-compiled component + meta */ };
export type ModuleIndex = {
  number: number;
  slug: string;
  title: string;
  lessons: LessonMeta[];
};

export function listModules(): ModuleIndex[];
export function getModule(moduleSlug: string): ModuleIndex | null;
export function getLesson(slug: string): LessonModule | null;
```

Implementation lands in lesson 031. All four functions are synchronous because the loader resolves `import.meta.glob` eagerly at build time — lessons are a finite, build-frozen set, not a runtime data source.

## 6. URL structure

| URL | Renders |
|---|---|
| `/lessons` | All-modules index (Module 3's listing route, lesson 032) |
| `/lessons/<slug>` | Individual lesson (lesson 033) |
| `/modules/<moduleSlug>` | Single module's TOC (lesson 036's sidebar pattern; reserved but may not ship as a top-level route in v1) |

## 7. Authoring rules (for every lesson from 029 onward)

- **Write in second person plural ("we") for the body.** "We install Iconify because..." reads as a course. "You should install Iconify" reads as a command. The first-person "we" is Billy's voice; keep it.
- **Code blocks are fenced with language tags.** `` ```bash ``, `` ```ts ``, `` ```svelte ``, `` ```css ``. Lesson 034 wires syntax highlighting; the tags matter.
- **One commit per lesson.** The lesson markdown and the code change it describes land in the same commit. The lesson's "Commit this change" section is the literal command.
- **No screenshots in v1.** Markdown + prose only. Screenshots drift; prose is diffable.
- **No video.** Out of scope for v1 per SPEC.md §1.

## 8. Change log

- **2026-04-18** — Initial design. Lesson 029 introduces this document; lesson 030 retrofits existing lessons with frontmatter; lesson 031 builds the loader that consumes the schema.
