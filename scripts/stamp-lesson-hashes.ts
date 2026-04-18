/**
 * scripts/stamp-lesson-hashes.ts
 *
 * Walks every curriculum/**\/lesson-*.md, finds the git commit whose
 * subject matches the lesson's `Commit` block (or its expected
 * conventional-commit message), and inserts a `commit:` field into the
 * lesson's YAML front-matter.
 *
 * Idempotent: re-running on an already-stamped lesson rewrites the
 * same hash. Safe to run after every commit batch.
 *
 * Strategy:
 *   1. For each lesson file, compute its filename: lesson-NNN-<slug>.md.
 *   2. `git log --format=%H%x09%s` once for the whole repo (cached).
 *   3. Find the commit whose subject ends with `+ lesson NNN` (where
 *      NNN is the zero-padded lesson number from the filename).
 *   4. If found, rewrite the lesson's front-matter to include
 *      `commit: <hash>`. If `commit:` is already present, replace.
 *   5. Print a summary table at the end.
 *
 * Local-dev only — reads git, edits files in place, never writes git.
 *
 * Invoke:
 *     pnpm exec tsx scripts/stamp-lesson-hashes.ts
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const CURRICULUM = join(ROOT, 'curriculum');

type Commit = { hash: string; subject: string };

function loadCommits(): Commit[] {
	const raw = execSync('git log --format=%H%x09%s', { cwd: ROOT }).toString();
	return raw
		.split('\n')
		.filter((l) => l !== '')
		.map((l) => {
			const tab = l.indexOf('\t');
			return { hash: l.slice(0, tab), subject: l.slice(tab + 1) };
		});
}

function findCommit(commits: Commit[], lessonNumber: number): Commit | null {
	const plain = String(lessonNumber);
	const padded3 = plain.padStart(3, '0');
	const suffixes = [
		`+ lesson ${plain}`,
		`+ lesson ${padded3}`,
		`lesson ${plain}`,
		`lesson ${padded3}`
	];
	for (const c of commits) {
		for (const s of suffixes) {
			if (c.subject.endsWith(s)) return c;
		}
	}
	// Range match — e.g. "lessons 059-061" should resolve all three to the same commit.
	const rangePattern = /lessons\s+(\d+)-(\d+)/;
	for (const c of commits) {
		const match = rangePattern.exec(c.subject);
		if (match === null || match[1] === undefined || match[2] === undefined) continue;
		const lo = Number(match[1]);
		const hi = Number(match[2]);
		if (lessonNumber >= lo && lessonNumber <= hi) return c;
	}
	// Backfill match — lessons 001-014 were authored as part of the
	// "retrofit lessons 001-028 with frontmatter" commit.
	for (const c of commits) {
		if (c.subject.includes('retrofit lessons 001-028') && lessonNumber >= 1 && lessonNumber <= 14) {
			return c;
		}
	}
	return null;
}

function stampFrontMatter(content: string, hash: string): string {
	if (!content.startsWith('---\n')) return content;
	const end = content.indexOf('\n---\n', 4);
	if (end === -1) return content;
	const front = content.slice(4, end);
	const rest = content.slice(end + 5);

	const lines = front.split('\n');
	const commitIdx = lines.findIndex((l) => l.startsWith('commit:'));
	const newLine = `commit: ${hash}`;
	if (commitIdx >= 0) {
		lines[commitIdx] = newLine;
	} else {
		// Insert after `number:` for stable ordering.
		const numberIdx = lines.findIndex((l) => l.startsWith('number:'));
		if (numberIdx >= 0) {
			lines.splice(numberIdx + 1, 0, newLine);
		} else {
			lines.unshift(newLine);
		}
	}
	return `---\n${lines.join('\n')}\n---\n${rest}`;
}

async function listLessonFiles(): Promise<string[]> {
	const out: string[] = [];
	const modules = await readdir(CURRICULUM, { withFileTypes: true });
	for (const m of modules) {
		if (!m.isDirectory()) continue;
		const moduleDir = join(CURRICULUM, m.name);
		const files = await readdir(moduleDir);
		for (const f of files) {
			if (/^lesson-\d+-.*\.md$/.test(f)) out.push(join(moduleDir, f));
		}
	}
	return out;
}

async function main(): Promise<void> {
	const commits = loadCommits();
	const files = await listLessonFiles();
	files.sort();

	let stamped = 0;
	let skipped = 0;
	const missing: string[] = [];

	for (const path of files) {
		const filename = path.split('/').pop() ?? '';
		const match = /^lesson-(\d+)-/.exec(filename);
		if (match === null || match[1] === undefined) continue;
		const num = Number(match[1]);
		const commit = findCommit(commits, num);
		if (commit === null) {
			missing.push(filename);
			skipped++;
			continue;
		}
		const before = readFileSync(path, 'utf8');
		const after = stampFrontMatter(before, commit.hash);
		if (after !== before) {
			writeFileSync(path, after);
			stamped++;
		}
	}

	console.log(`[stamp-lesson-hashes] stamped: ${stamped}, skipped: ${skipped}`);
	if (missing.length > 0) {
		console.log('[stamp-lesson-hashes] no matching commit found for:');
		for (const f of missing) console.log(`  - ${f}`);
	}
}

await main();
