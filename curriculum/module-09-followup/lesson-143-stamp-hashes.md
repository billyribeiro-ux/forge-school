---
number: 143
slug: stamp-hashes
title: Stamp every lesson's front-matter with its commit hash
module: 9
moduleSlug: followup
moduleTitle: v1.0 Follow-up
phase: 9
step: 8
previous: 142
next: null
estimatedMinutes: 15
filesTouched:
  - scripts/stamp-lesson-hashes.ts
  - curriculum/**/lesson-*.md
---

## Context

PROMPT.md SUCCESS CRITERIA: "Every lesson's front-matter references a real commit hash in the repo." Until now lessons referenced their commit by message in the "Commit" section but had no machine-readable hash field. This lesson ships a one-shot, idempotent script that walks every `curriculum/**/lesson-*.md`, finds the commit whose subject ends with `+ lesson NNN` (or `lessons NNN-MMM` for batched commits, or the special "retrofit lessons 001-028" backfill), and writes a `commit: <hash>` line into the front-matter immediately after `number:`.

## The command

`scripts/stamp-lesson-hashes.ts` — pure-Node tsx script:

```ts
function findCommit(commits: Commit[], lessonNumber: number): Commit | null {
  // Single-lesson commits: subject ends with "+ lesson 87" or "+ lesson 087"
  for (const c of commits) {
    for (const s of [`+ lesson ${plain}`, `+ lesson ${padded3}`, `lesson ${plain}`, `lesson ${padded3}`]) {
      if (c.subject.endsWith(s)) return c;
    }
  }
  // Range commits: "lessons 059-061"
  // Backfill: "retrofit lessons 001-028" matches lessons 001-014 in module-01
  // …
}

function stampFrontMatter(content: string, hash: string): string {
  // Parse YAML front-matter, insert/replace `commit: <hash>` after `number:`,
  // preserve every other key + the lesson body byte-for-byte.
}
```

Run:

```bash
pnpm exec tsx scripts/stamp-lesson-hashes.ts
# [stamp-lesson-hashes] stamped: 17, skipped: 0
pnpm exec tsx scripts/stamp-lesson-hashes.ts
# [stamp-lesson-hashes] stamped: 0, skipped: 0   ← idempotent
```

## Why we chose this — the PE7 judgment

**Alt 1: Add `commit:` by hand to every lesson on commit.** You can't — at write-time the lesson is uncommitted, so the hash doesn't exist. Stamping is necessarily a post-commit pass.
**Alt 2: A pre-commit hook that stamps.** Pre-commit can't know the commit's own hash; the hash is determined AT commit time. Could be a `post-commit` hook, but you'd have to amend (which we explicitly don't), so it'd be a follow-up commit anyway.
**Alt 3: Store the lesson → commit mapping in a side file.** Worse — front-matter is the canonical lesson metadata; an external map drifts.
**Alt 4: Skip the hash entirely.** Violates SUCCESS CRITERIA. The hash is the auditable bridge between the curriculum and the repo — you can `git show <hash>` any lesson's actual diff.

The PE7 choice — **a one-shot idempotent stamper that handles single, range, and backfill commit shapes** — wins because it's run-anytime safe, replays cleanly after every commit batch, and works for the unusual cases (multi-lesson commits, retrofit lessons that share a single commit).

## What could go wrong

**Symptom:** Stamper reports "skipped" with a missing-commit list
**Cause:** A lesson's commit subject doesn't follow the `+ lesson NNN` convention.
**Fix:** Either rename the file to drop the leading zero, write a follow-up commit that mentions the lesson properly, or extend `findCommit` with another pattern.

**Symptom:** Stamper inserts `commit:` in the wrong spot inside the YAML block
**Cause:** Missing `number:` line — script anchors the insertion to `number:` for stable ordering.
**Fix:** Every lesson template starts with `number:` per PROMPT. If a lesson omits it, fix the template first.

**Symptom:** Re-running the stamper rewrites every line
**Cause:** Hash changed (an upstream rebase moved commits).
**Fix:** Re-stamp after any history-changing operation. The script is idempotent — it overwrites in place.

## Verify

```bash
pnpm exec tsx scripts/stamp-lesson-hashes.ts        # stamps any new
pnpm check                                          # 0 errors
pnpm build                                          # ✓ built
grep -c "^commit: " curriculum/**/lesson-*.md       # >= 135
```

## Mistake log

- First version regex'd for `+ lesson NN` (no padding). Lessons 080-091 use `lesson 080` (padded), so half didn't match. Tried both forms.
- Forgot the multi-lesson commit (`lessons 059-061`). Added a `range` pattern.
- Lessons 001-014 don't have their own commits — they were backfilled into the "retrofit lessons 001-028" commit. Added a special-case fallback.

## Commit

```bash
git add scripts/stamp-lesson-hashes.ts curriculum/
git add curriculum/module-09-followup/lesson-143-stamp-hashes.md
git commit -m "tooling(curriculum): stamp lesson commit hashes + lesson 143"
```
