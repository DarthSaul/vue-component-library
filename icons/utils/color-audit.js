#!/usr/bin/env node

/**
 * color-audit.js
 *
 * Thin CLI over lib/detect-colors.js. Walks the canonical icon set, classifies
 * each icon by how it paints itself, and writes a remediation list for the
 * currentColor conversion work.
 *
 *   ok                     — no hardcoded colors; nothing to do.
 *   single-color-hardcoded — exactly one distinct color; convert to currentColor.
 *   multi-color            — several distinct colors; assumed intentional, leave alone.
 *
 * Read-only: it never edits, renames or deletes anything in the icon
 * directory. The only file it writes is the report.
 *
 * Usage:
 *   node icons/utils/color-audit.js --source ../flat-icons
 *   node icons/utils/color-audit.js --source ../flat-icons --out report.json
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import fg from 'fast-glob';
import { CLASSIFICATIONS, detectColors } from './lib/detect-colors.js';
import { fromIconsRoot, resolveIconSource } from './lib/icon-source.js';

// ─── CLI ────────────────────────────────────────────────────────────────

const { values: args } = parseArgs({
	options: {
		source: { type: 'string', short: 's' },
		out: {
			type: 'string',
			short: 'o',
			default: 'currentcolor-remediation.json',
		},
		help: { type: 'boolean', short: 'h', default: false },
	},
});

if (args.help) {
	console.log(`
Usage: node icons/utils/color-audit.js [options]

Audits hardcoded fill/stroke colors across the canonical icon set.

Options:
  -s, --source <dir>  REQUIRED. Icon directory. Relative paths resolve
                      against icons/, e.g. --source ../flat-icons
  -o, --out <file>    Report path, relative to icons/
                      (default: currentcolor-remediation.json)
  -h, --help          Show this help
  `);
	process.exit(0);
}

/** Prefer a short relative path, but fall back to absolute when it escapes cwd. */
function displayPath(path) {
	const rel = relative(process.cwd(), path);
	return !rel || rel.startsWith('..') ? path : rel;
}

let sourcePath;

try {
	sourcePath = resolveIconSource(args.source);
} catch (error) {
	console.error(`\n  ${error.message}\n`);
	process.exit(1);
}

const outPath = fromIconsRoot(args.out);

// ─── Audit ──────────────────────────────────────────────────────────────

const files = fg.sync('**/*.svg', { cwd: sourcePath, onlyFiles: true }).sort();

if (files.length === 0) {
	console.error(`\n  No SVG files found in ${sourcePath}\n`);
	process.exit(1);
}

const counts = {
	[CLASSIFICATIONS.OK]: 0,
	[CLASSIFICATIONS.SINGLE]: 0,
	[CLASSIFICATIONS.MULTI]: 0,
};

const entries = [];
const unreadable = [];
let warningCount = 0;

for (const file of files) {
	let source;

	try {
		source = readFileSync(resolve(sourcePath, file), 'utf-8');
	} catch (error) {
		unreadable.push({ path: file, reason: error.message });
		continue;
	}

	const { classification, colors, warnings } = detectColors(source);

	counts[classification]++;
	warningCount += warnings.length;

	// Report carries only the icons that need attention.
	if (classification === CLASSIFICATIONS.OK && warnings.length === 0) continue;

	entries.push({
		path: file,
		classification,
		colors: colors.map((entry) => ({
			color: entry.color,
			kind: entry.kind,
			raw: entry.raw,
			occurrences: entry.occurrences,
		})),
		...(warnings.length > 0 ? { warnings } : {}),
	});
}

const report = {
	generatedAt: new Date().toISOString(),
	source: displayPath(sourcePath),
	summary: {
		totalIcons: files.length,
		ok: counts[CLASSIFICATIONS.OK],
		singleColorHardcoded: counts[CLASSIFICATIONS.SINGLE],
		multiColor: counts[CLASSIFICATIONS.MULTI],
		warnings: warningCount,
	},
	icons: entries,
	...(unreadable.length > 0 ? { unreadable } : {}),
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

// ─── Summary ────────────────────────────────────────────────────────────

const displayOut = displayPath(outPath);

console.log('─'.repeat(64));
console.log(`  Source:                   ${sourcePath}`);
console.log(`  Icons scanned:            ${files.length}\n`);
console.log(`  ok:                       ${counts[CLASSIFICATIONS.OK]}`);
console.log(
	`  single-color-hardcoded:   ${counts[CLASSIFICATIONS.SINGLE]}  → convert to currentColor`,
);
console.log(
	`  multi-color:              ${counts[CLASSIFICATIONS.MULTI]}  → leave alone`,
);

if (warningCount > 0) {
	console.log(`\n  Warnings:                 ${warningCount}`);
}

if (unreadable.length > 0) {
	console.log(`  Unreadable (skipped):     ${unreadable.length}`);
	for (const entry of unreadable) {
		console.log(`    ! ${entry.path} — ${entry.reason}`);
	}
}

console.log('\n' + '─'.repeat(64));
console.log(`  Report: ${displayOut}`);
console.log();
