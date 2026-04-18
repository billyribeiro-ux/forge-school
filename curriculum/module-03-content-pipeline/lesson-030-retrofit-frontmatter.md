---
number: 30
slug: retrofit-frontmatter
title: Retrofit existing lessons with frontmatter
module: 3
moduleSlug: content-pipeline
moduleTitle: Content Pipeline
phase: 3
step: 2
previous: 29
next: 31
estimatedMinutes: 20
filesTouched:
  - curriculum/module-01-foundation/*.md
  - curriculum/module-02-data/*.md
---

## Context

Lesson 029 locked the frontmatter schema. Twenty-eight existing lessons — every `.md` file in `curriculum/module-01-foundation/` and `curriculum/module-02-data/` — don't have frontmatter yet; they have a prose header block of six markdown lines (`**Module:** 1 — Foundation`, `**Phase:** ...`, and so on). Lesson 031 is going to build a loader that reads frontmatter; that loader would ignore or mis-parse the prose header.

This lesson does the mechanical transform: for each existing lesson, replace the prose header with an equivalent YAML frontmatter block, drop the H1 title line (the renderer derives the page title from `frontmatter.title`), and leave the body sections untouched. No prose is rewritten. No code is changed. The only thing shifting is the metadata location: prose to YAML.

The retrofit is a single commit because it's one logical change ("normalize the curriculum corpus to the schema from lesson 029"). The commit touches 28 files; each diff is a ~7-line delete + a ~12-line add at the top of the file. A PR reviewer can scan the diffs in about a minute.

## The command

The mechanical replacement pattern, applied to each of the 28 files:

**Before:**

```markdown
# Lesson NNN — Lesson Title Here

**Module:** N — Module Title
**Phase:** PE7 Build Order → Phase P, Step S
**Previous lesson:** X — prev lesson title
**Next lesson:** Y — next lesson title
**Estimated time:** M minutes
**Files touched:** `path/a`, `path/b`

---

## Context

[body continues unchanged]
```

**After:**

```markdown
---
number: NNN
slug: kebab-slug-from-filename
title: Lesson Title Here
module: N
moduleSlug: foundation
moduleTitle: Foundation
phase: P
step: S
previous: X
next: Y
estimatedMinutes: M
filesTouched:
  - path/a
  - path/b
---

## Context

[body continues unchanged]
```

Six substantive transforms per file:

1. **H1 line removed.** The loader derives the page title from `frontmatter.title`.
2. **Prose metadata block removed.** Replaced with YAML frontmatter at the very top of the file.
3. **`number`, `slug`, `title`** derived from the filename and the old H1.
4. **`module`, `moduleSlug`, `moduleTitle`, `phase`, `step`** derived from the folder name and the prose `**Module:** / **Phase:**` lines.
5. **`previous` / `next`** converted from prose numbers to integers. `null` for lesson 001's previous; integer otherwise.
6. **`filesTouched`** converted from a backtick-fenced prose list to a YAML sequence. The `.md` extension and file paths become list items; cosmetic punctuation (commas, backticks) is stripped.

Verification that all 28 files ended up well-formed:

```bash
# Every lesson starts with frontmatter
for f in curriculum/module-0{1,2}-*/lesson-*.md; do
  head -1 "$f" | grep -q '^---$' || echo "MISSING FRONTMATTER: $f"
done
```

Expected: no "MISSING" output.

```bash
# Frontmatter closes with --- before the first ## Context
for f in curriculum/module-0{1,2}-*/lesson-*.md; do
  awk '/^---$/{n++} /^## Context/{if(n<2) print "BAD FM: " FILENAME; exit}' "$f"
done
```

Expected: no "BAD FM" output.

```bash
# Number field matches the filename
for f in curriculum/module-0{1,2}-*/lesson-*.md; do
  filename_n=$(basename "$f" | sed -E 's/lesson-0*([0-9]+)-.*/\1/')
  meta_n=$(grep '^number:' "$f" | awk '{print $2}')
  [[ "$filename_n" == "$meta_n" ]] || echo "MISMATCH: $f ($filename_n vs $meta_n)"
done
```

Expected: no "MISMATCH" output.

```bash
pnpm check
```

Expected: 0 errors. (The markdown files aren't type-checked — but mdsvex still compiles them as Svelte components, and if a frontmatter edit broke the YAML parse, the mdsvex compile would fail at `pnpm build`.)

```bash
pnpm build
```

Expected: build succeeds, mdsvex compiles every `.md` file as a Svelte component without errors.

## Why we chose this — the PE7 judgment

**Alternative 1: Keep both the prose header AND add frontmatter to new lessons only**
Every new lesson authored from 029 onward uses the new schema; lessons 001-028 keep the old format. The loader parses both by detecting which format is present. This is a lot of loader complexity for a transient state — eventually we'd normalize anyway. And the prose/YAML duality would be a persistent footgun where authors copy the wrong template. Normalize once; be done.

**Alternative 2: Write a script that applies the retrofit and commit its output**
Tempting, and valid. For 28 files with predictable shapes, a sed/awk script is ~40 lines. We did the retrofit by hand-crafted edits because each file's `filesTouched` list and title required a human pass anyway — the script would have needed 28 per-file overrides for title casing and file-path trimming. Hand-edits are actually faster in aggregate for this corpus.

**Alternative 3: Defer the retrofit until the loader is written**
"Build the loader first, retrofit on demand as lessons are loaded." The loader's validation fires at build time, not load time — a lesson missing frontmatter would fail the whole build. Better to fix the corpus first, then write a loader that can assume well-formed input. Also: the retrofit is a one-time operation; deferring adds no value.

**Alternative 4: Remove the `---` visual separator below the frontmatter**
Some mdsvex templates omit the separator between YAML and Markdown. Confusing to read in a text editor — the frontmatter bleeds into the body visually. We keep the `---` + blank line + `## Context` separator as documented in `docs/CURRICULUM.md §3`.

**Alternative 5: Drop `module`, `moduleSlug`, `moduleTitle` from lesson frontmatter — derive from folder name**
The folder name is `module-01-foundation`, and we could regex out `01` + `foundation` at loader time. Tempting. Brittle — folder renames (unlikely, but possible for rebranding) would silently corrupt the mapping. Explicit frontmatter is self-describing; the loader doesn't need to know folder conventions to interpret a lesson.

The PE7 choice — normalize all 28 existing lessons in one commit, drop the H1, explicit module metadata per lesson — wins because it produces a uniform corpus the loader can trust and keeps lesson files self-describing regardless of their folder location.

## What could go wrong

**Symptom:** `pnpm build` fails with `YAMLException: bad indentation of a mapping entry`
**Cause:** One of the retrofits has invalid YAML — usually a missing space after a colon, a tab character, or a list item without the `-` prefix.
**Fix:** Run the build, look at the file path in the error, inspect the frontmatter with `head -20`. Fix the YAML. Common culprits: `filesTouched:` with items not prefixed by `  - `, or a colon inside a title string that needed quotes.

**Symptom:** mdsvex compiles but the rendered page has no title
**Cause:** The H1 was removed from the body, but the loader's renderer (lesson 033) hasn't been written yet. The frontmatter has `title:` but no one is reading it.
**Fix:** Expected state until lesson 033 lands. In the interim, you can preview lesson content via the raw Markdown view; the on-site rendering is not the target yet.

**Symptom:** A lesson's `previous` or `next` doesn't match its prev/next peer
**Cause:** Typo or off-by-one when converting the prose numbers to integers.
**Fix:** The loader validation (lesson 031) detects broken chains and errors. Until then, a script like:

```bash
for i in $(seq 1 28); do
  f=$(ls curriculum/module-0{1,2}-*/lesson-$(printf '%03d' $i)-*.md 2>/dev/null)
  next=$(grep '^next:' "$f" | awk '{print $2}')
  expected=$((i + 1))
  if [[ $next != "$expected" && ! ($i -eq 28 && $next -eq 29) ]]; then
    echo "CHAIN BREAK at $f (next=$next, expected=$expected)"
  fi
done
```

**Symptom:** `filesTouched: []` (empty array) on doc-only lessons (016, 027, 028)
**Cause:** These are checkpoints / walkthroughs that produce no code change — the array is genuinely empty.
**Fix:** Not a problem. YAML's `[]` is a valid empty sequence; the loader should handle it.

## Verify

```bash
# Every existing lesson starts with YAML frontmatter
grep -L '^---$' curriculum/module-0{1,2}-*/lesson-*.md
```
Expected: empty (no files failing the grep's "not-matching" flag).

```bash
# Total lesson count
ls curriculum/module-0{1,2,3}-*/lesson-*.md | wc -l
```
Expected: `30` — 16 (Module 1) + 12 (Module 2) + 2 (Module 3 so far: lessons 029 and 030 itself).

```bash
# pnpm build still compiles all .md files
pnpm build
```
Expected: 0 errors.

```bash
pnpm check
```
Expected: 0 errors.

## Mistake log — things that went wrong the first time I did this

- **Left a blank line between the last YAML key and the closing `---`.** Got:
  ```yaml
  filesTouched:
    - package.json
    - .npmrc
    - pnpm-workspace.yaml

  ---
  ```
  mdsvex's YAML parser accepted it; a stricter parser (gray-matter in strict mode) would reject. Tightened the shape so there's no blank line before `---`. Consistent across all 28 files now.
- **Misread a title and dropped a word.** The H1 for lesson 007 was "Install mdsvex and wire Markdown rendering"; a first pass at the frontmatter wrote "Install mdsvex and wire Markdown". Caught on review. Rule: when transcribing titles, diff the new frontmatter against the removed H1 before committing.
- **Used quoted strings for all title values.** The schema didn't require quoting; many titles contain no YAML-special characters. Result: `title: "Install mdsvex..."` everywhere. Pulled the quotes off where safe; quoted only when the title contains a `:` or starts with a special character.
- **Forgot to retrofit lesson 029 itself.** Thought "it's new, it already has frontmatter, skip it" — it DID already have frontmatter. But then realized lesson 030 (this lesson) needed to be authored using the same schema, so I double-checked lesson 029's shape, and caught that I'd used `module: 3` where I'd also needed to confirm the moduleSlug was exactly `content-pipeline`. The check passed; no fix needed, but the review was worthwhile.

## Commit this change

```bash
git add curriculum/module-0{1,2}-*/lesson-*.md
git add curriculum/module-03-content-pipeline/lesson-030-retrofit-frontmatter.md
git commit -m "docs(curriculum): retrofit lessons 001-028 with frontmatter + lesson 030"
```

The corpus is now uniform. Every `.md` file in `curriculum/` declares its metadata in YAML that the loader can parse into a typed `LessonMeta`. Lesson 031 writes that loader.
