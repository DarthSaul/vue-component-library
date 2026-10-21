#!/usr/bin/env node

/**
 * dedupe-icons.js
 *
 * Audits a flattened SVG icon library for duplicates, aliases, and name
 * collisions. Every SVG is normalized with SVGO *in memory* and hashed, so
 * files are grouped by what they actually draw rather than what they are
 * called.
 *
 * Report-only by default — nothing on disk is touched unless `--apply` is
 * passed. The intended workflow is:
 *
 *   1. node icons/utils/dedupe-icons.js
 *        → writes icons/dedupe-report.json + icons/dedupe-contact-sheet.html
 *   2. Open the contact sheet, decide the canonical name for every ALIAS and
 *      FALSE_DUPLICATE group, and fill in the empty `canonicalName` fields in
 *      the report.
 *   3. node icons/utils/dedupe-icons.js --apply
 *        → deletes the redundant files and renames the keepers.
 *
 * Usage:
 *   node icons/utils/dedupe-icons.js
 *   node icons/utils/dedupe-icons.js --source flat --report dedupe-report.json
 *   node icons/utils/dedupe-icons.js --apply
 */

import {
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, dirname, extname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { optimize } from 'svgo';
import fg from 'fast-glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Everything resolves against the icons package, not the cwd, so the script
// behaves the same whether it is run from the repo root or from icons/.
const iconsRoot = resolve(__dirname, '..');

// ─── CLI ────────────────────────────────────────────────────────────────

const { values: args } = parseArgs({
	options: {
		source: { type: 'string', short: 's', default: 'flat' },
		report: { type: 'string', short: 'r', default: 'dedupe-report.json' },
		'contact-sheet': {
			type: 'string',
			short: 'c',
			default: 'dedupe-contact-sheet.html',
		},
		apply: { type: 'boolean', default: false },
		help: { type: 'boolean', short: 'h', default: false },
	},
});

if (args.help) {
	console.log(`
Usage: node icons/utils/dedupe-icons.js [options]

Audits a flattened SVG icon directory. Report-only unless --apply is passed.

Options:
  -s, --source <dir>          Flat icon directory, relative to icons/
                              (default: flat)
  -r, --report <file>         Report path, relative to icons/
                              (default: dedupe-report.json)
  -c, --contact-sheet <file>  Contact sheet path, relative to icons/
                              (default: dedupe-contact-sheet.html)
      --apply                 Read the report and execute the removals and
                              renames it describes. Refuses to run while any
                              required canonicalName is still empty.
  -h, --help                  Show this help
  `);
	process.exit(0);
}

/** Resolve a user-supplied path against icons/ unless it is already absolute. */
function fromIconsRoot(path) {
	return isAbsolute(path) ? path : resolve(iconsRoot, path);
}

const sourcePath = fromIconsRoot(args.source);
const reportPath = fromIconsRoot(args.report);
const contactSheetPath = fromIconsRoot(args['contact-sheet']);

// ─── SVGO ───────────────────────────────────────────────────────────────

/**
 * Deterministic normalization config. The goal is not the smallest possible
 * file — it is that two files drawing the same icon collapse to byte-identical
 * output so their hashes match.
 *
 * preset-default already covers the required cleanup: removeComments,
 * removeMetadata, removeEmptyContainers, removeUnusedNS, convertPathData and
 * convertColors. The overrides below pin the parts that would otherwise vary.
 */
const SVGO_CONFIG = {
	multipass: true,
	js2svg: { indent: 0, pretty: false },
	plugins: [
		{
			name: 'preset-default',
			params: {
				overrides: {
					// Minified ids make identical art hash identically regardless
					// of what the source file happened to name its gradients.
					cleanupIds: {
						minify: true,
						preserve: [],
						preservePrefixes: [],
					},
					// Fixed precision keeps path data stable run to run.
					convertPathData: {
						floatPrecision: 3,
						transformPrecision: 5,
					},
					convertTransform: { floatPrecision: 3 },
					// Canonicalize colors so "black", "#000000" and "rgb(0,0,0)"
					// all land on the same token. currentColor conversion is
					// deliberately off — that is a separate, per-icon decision.
					convertColors: {
						currentColor: false,
						names2hex: true,
						rgb2hex: true,
						shorthex: true,
						shortname: false,
					},
				},
			},
		},
		// svgo v4's preset-default already preserves viewBox.
		//
		// title/desc are per-export accessibility text, not art. Two files that
		// draw the same icon are the same icon whether or not one of them
		// carries a <title>, and sprite builds regenerate this anyway.
		'removeTitle',
		'removeDesc',
		// Two copies of an icon exported at 16px and 24px are the same icon as
		// far as a sprite is concerned, so drop the declared dimensions and let
		// the viewBox carry the geometry.
		'removeDimensions',
		// Attribute order is an export artifact, not a difference.
		'sortAttrs',
	],
};

/** Normalize SVG markup in memory. Never writes back to the source file. */
function normalize(svg, path) {
	return optimize(svg, { ...SVGO_CONFIG, path }).data;
}

function hashOf(content) {
	return createHash('sha256').update(content).digest('hex');
}

// ─── Naming ─────────────────────────────────────────────────────────────

/**
 * Convert a name to kebab-case. Mirrors the algorithm in flatten-icons.js so
 * the two scripts agree on what an icon is called.
 */
function toKebabCase(name) {
	return name
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
		.replace(/[\s_.()]+/g, '-')
		.replace(/[^a-zA-Z0-9-]/g, '')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
		.toLowerCase();
}

/**
 * The icon name a file is *claiming*, with flatten-icons.js's disambiguating
 * suffix stripped back off.
 *
 *   "check.svg"                    → "check"
 *   "check--from-actions.svg"      → "check"
 *   "check--from-navigation-2.svg" → "check"
 */
function baseNameOf(fileName) {
	return basename(fileName, extname(fileName)).replace(/--from-.*$/, '');
}

// ─── Paint detection ────────────────────────────────────────────────────

const IGNORED_PAINTS = new Set([
	'none',
	'currentcolor',
	'inherit',
	'transparent',
	'initial',
	'unset',
	'context-fill',
	'context-stroke',
]);

const PAINT_PATTERNS = [
	/\b(fill|stroke|stop-color)\s*=\s*"([^"]*)"/gi,
	/\b(fill|stroke|stop-color)\s*=\s*'([^']*)'/gi,
	/\b(fill|stroke|stop-color)\s*:\s*([^;"'}]+)/gi,
];

/**
 * Collect paint values that are baked into the markup.
 *
 * This deliberately runs against the *raw* source rather than the normalized
 * output. SVGO strips `fill="#000000"` and `fill="black"` outright, because
 * black is the SVG default fill — so by the time markup is normalized, the
 * very icons this is meant to catch look like they have no paint at all.
 *
 * Gradient and pattern references (url(#...)) are skipped; those are resolved
 * separately via their stop-color values.
 */
function findHardcodedPaints(rawSvg) {
	const markup = rawSvg.replace(/<!--[\s\S]*?-->/g, '');
	const found = new Set();

	for (const pattern of PAINT_PATTERNS) {
		for (const match of markup.matchAll(pattern)) {
			const value = match[2].trim();
			const lower = value.toLowerCase();

			if (!value) continue;
			if (IGNORED_PAINTS.has(lower)) continue;
			if (lower.startsWith('url(')) continue;

			found.add(value);
		}
	}

	return [...found].sort();
}

// ─── Scan ───────────────────────────────────────────────────────────────

/** Read, normalize and fingerprint every SVG under the source directory. */
function scanIcons() {
	const matches = fg.sync('**/*.svg', {
		cwd: sourcePath,
		absolute: false,
		onlyFiles: true,
	});

	const files = [];
	const unreadable = [];

	for (const relPath of matches.sort()) {
		const absPath = resolve(sourcePath, relPath);
		let raw;

		try {
			raw = readFileSync(absPath, 'utf-8');
		} catch (error) {
			unreadable.push({ path: relPath, reason: error.message });
			continue;
		}

		let normalized;

		try {
			normalized = normalize(raw, absPath);
		} catch (error) {
			// Malformed SVG. Surface it rather than silently hashing garbage.
			unreadable.push({ path: relPath, reason: error.message });
			continue;
		}

		const name = basename(relPath);
		const hardcodedPaints = findHardcodedPaints(raw);
		// An icon only tracks CSS `color` through a <use> boundary if something
		// in it actually says currentColor. An icon with no paint at all still
		// renders black, so absence is a flag, not a pass.
		const usesCurrentColor = /currentColor/i.test(normalized);

		files.push({
			path: relPath,
			name,
			baseName: baseNameOf(name),
			hash: hashOf(normalized),
			bytes: Buffer.byteLength(raw),
			normalizedBytes: Buffer.byteLength(normalized),
			hardcodedPaints,
			usesCurrentColor,
			colorable: usesCurrentColor && hardcodedPaints.length === 0,
			depth: relPath.split('/').length,
			normalized,
		});
	}

	return { files, unreadable };
}

/**
 * Pick which file in a group survives. Prefers an icon already sitting in the
 * flat root over one exiled to duplicates/, then the shortest (least
 * suffixed) name, then alphabetical for a stable tiebreak.
 */
function pickKeeper(group) {
	return [...group].sort(
		(a, b) =>
			a.depth - b.depth ||
			a.name.length - b.name.length ||
			a.path.localeCompare(b.path),
	)[0];
}

/**
 * Group files by normalized hash and classify each group.
 *
 *   CLEAN           one file, name used by nothing else
 *   TRUE_DUPLICATE  same art, same claimed name — collapse to one file
 *   ALIAS           same art, different names — a human picks the real name
 *   FALSE_DUPLICATE different art sharing a name — a human renames them apart
 */
function buildGroups(files) {
	const byHash = new Map();
	const hashesByBaseName = new Map();

	for (const file of files) {
		if (!byHash.has(file.hash)) byHash.set(file.hash, []);
		byHash.get(file.hash).push(file);

		if (!hashesByBaseName.has(file.baseName)) {
			hashesByBaseName.set(file.baseName, new Set());
		}
		hashesByBaseName.get(file.baseName).add(file.hash);
	}

	const groups = [];

	for (const [hash, group] of byHash) {
		const baseNames = [...new Set(group.map((f) => f.baseName))].sort();

		// A name claimed by more than one distinct icon is a false duplicate,
		// whatever else is true of this group.
		const collidingNames = baseNames.filter(
			(name) => hashesByBaseName.get(name).size > 1,
		);

		let classification;

		if (collidingNames.length > 0) {
			classification = 'FALSE_DUPLICATE';
		} else if (group.length === 1) {
			classification = 'CLEAN';
		} else if (baseNames.length === 1) {
			classification = 'TRUE_DUPLICATE';
		} else {
			classification = 'ALIAS';
		}

		const needsCanonicalName =
			classification === 'ALIAS' || classification === 'FALSE_DUPLICATE';
		const keeper = pickKeeper(group);

		groups.push({
			id: hash.slice(0, 12),
			classification,
			hash,
			baseNames,
			// Which name these files are fighting over. Lets the contact sheet
			// put every variant of "check" next to every other variant.
			collisionKey: collidingNames.length > 0 ? collidingNames.join('+') : null,
			// Prefilled where the answer is not in question; left empty where a
			// human has to decide.
			canonicalName: needsCanonicalName ? '' : keeper.baseName,
			needsCanonicalName,
			keep: classification === 'CLEAN' ? null : keeper.path,
			remove:
				classification === 'CLEAN'
					? []
					: group.filter((f) => f !== keeper).map((f) => f.path),
			files: group.map((f) => ({
				path: f.path,
				name: f.name,
				baseName: f.baseName,
				bytes: f.bytes,
				normalizedBytes: f.normalizedBytes,
				hardcodedPaints: f.hardcodedPaints,
				usesCurrentColor: f.usesCurrentColor,
				colorable: f.colorable,
			})),
		});
	}

	// Stable, review-friendly ordering: things needing attention first.
	const order = {
		FALSE_DUPLICATE: 0,
		ALIAS: 1,
		TRUE_DUPLICATE: 2,
		CLEAN: 3,
	};

	groups.sort(
		(a, b) =>
			order[a.classification] - order[b.classification] ||
			(a.collisionKey ?? '').localeCompare(b.collisionKey ?? '') ||
			a.baseNames[0].localeCompare(b.baseNames[0]) ||
			a.id.localeCompare(b.id),
	);

	return groups;
}

// ─── Contact sheet ──────────────────────────────────────────────────────

function plural(count, noun) {
	return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function escapeHtml(value) {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * Namespace every id in an SVG before inlining it. SVGO minifies ids down to
 * "a", "b", "c" — drop two of those into one document and the second icon's
 * gradients silently resolve against the first icon's defs.
 */
function scopeIds(svg, prefix) {
	const ids = new Set();

	for (const match of svg.matchAll(/\sid="([^"]+)"/g)) {
		ids.add(match[1]);
	}

	let out = svg;

	for (const id of ids) {
		const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

		out = out
			.replace(new RegExp(`(\\sid=")${escaped}(")`, 'g'), `$1${prefix}${id}$2`)
			.replace(new RegExp(`(url\\(#)${escaped}(\\))`, 'g'), `$1${prefix}${id}$2`)
			.replace(
				new RegExp(`((?:xlink:)?href="#)${escaped}(")`, 'g'),
				`$1${prefix}${id}$2`,
			);
	}

	return out;
}

/** Prepare normalized markup for inlining into the contact sheet. */
function inlineSvg(file, prefix) {
	const stripped = file.normalized
		.replace(/<\?xml[\s\S]*?\?>/gi, '')
		.replace(/<!DOCTYPE[\s\S]*?>/gi, '')
		.trim();

	return scopeIds(stripped, prefix);
}

function renderFigure(file, prefix) {
	const paints = file.hardcodedPaints.length
		? `<p class="paints">${file.hardcodedPaints
				.map(
					(paint) =>
						`<span class="swatch" style="background:${escapeHtml(
							paint,
						)}"></span><code>${escapeHtml(paint)}</code>`,
				)
				.join('')}</p>`
		: `<p class="paints muted">${
				file.usesCurrentColor
					? 'currentColor'
					: 'no paint — inherits black'
			}</p>`;

	return `
				<figure>
					<div class="art">${inlineSvg(file, prefix)}</div>
					<figcaption>
						<code class="filename">${escapeHtml(file.path)}</code>
						${paints}
					</figcaption>
				</figure>`;
}

/**
 * Render the groups that need a human decision — ALIAS and FALSE_DUPLICATE —
 * side by side so the whole set can be reviewed in one pass.
 */
function buildContactSheet(groups, fileIndex) {
	const aliases = groups.filter((g) => g.classification === 'ALIAS');
	const falseDupes = groups.filter(
		(g) => g.classification === 'FALSE_DUPLICATE',
	);

	// Cluster false duplicates by the name they are fighting over, so every
	// variant of "check" renders in one row.
	const collisions = new Map();

	for (const group of falseDupes) {
		if (!collisions.has(group.collisionKey)) {
			collisions.set(group.collisionKey, []);
		}
		collisions.get(group.collisionKey).push(group);
	}

	const sections = [];

	for (const [collisionKey, variants] of [...collisions].sort((a, b) =>
		a[0].localeCompare(b[0]),
	)) {
		const variantMarkup = variants
			.map(
				(group) => `
			<article class="variant">
				<header>
					<code class="gid">${escapeHtml(group.id)}</code>
					<span class="hint">canonicalName: <em>fill me in</em></span>
				</header>
				<div class="icons">${group.files
					.map((file) => renderFigure(fileIndex.get(file.path), `${group.id}-`))
					.join('')}
				</div>
			</article>`,
			)
			.join('');

		sections.push(`
		<section>
			<h2><span class="badge false">FALSE DUPLICATE</span> ${escapeHtml(
				collisionKey,
			)}</h2>
			<p class="lede">${variants.length} distinct icons claim this name. Give each group its own <code>canonicalName</code> in the report.</p>
			<div class="variants">${variantMarkup}
			</div>
		</section>`);
	}

	for (const group of aliases) {
		sections.push(`
		<section>
			<h2><span class="badge alias">ALIAS</span> ${escapeHtml(
				group.baseNames.join(', '),
			)}</h2>
			<p class="lede">One icon filed under ${
				group.files.length
			} names. Pick the <code>canonicalName</code> for group <code>${escapeHtml(
				group.id,
			)}</code>; the rest are deleted.</p>
			<div class="variants">
				<article class="variant">
					<div class="icons">${group.files
						.map((file) => renderFigure(fileIndex.get(file.path), `${group.id}-`))
						.join('')}
					</div>
				</article>
			</div>
		</section>`);
	}

	const body = sections.length
		? sections.join('')
		: `<section><p class="lede">Nothing to review — no aliases or false duplicates found.</p></section>`;

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Icon dedupe contact sheet</title>
<style>
	:root {
		--bg: #ffffff;
		--panel: #f6f7f9;
		--border: #d8dce3;
		--text: #14171c;
		--muted: #6b7280;
		--art-bg: #ffffff;
	}
	[data-theme="dark"] {
		--bg: #14171c;
		--panel: #1d2128;
		--border: #333a45;
		--text: #e8eaed;
		--muted: #9aa3b2;
		--art-bg: #14171c;
	}
	* { box-sizing: border-box; }
	body {
		margin: 0;
		padding: 24px;
		background: var(--bg);
		color: var(--text);
		font: 14px/1.5 ui-sans-serif, system-ui, -apple-system, sans-serif;
	}
	h1 { font-size: 20px; margin: 0 0 4px; }
	h2 { font-size: 15px; margin: 0 0 4px; display: flex; align-items: center; gap: 8px; }
	.toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
	button {
		font: inherit;
		padding: 6px 12px;
		border-radius: 6px;
		border: 1px solid var(--border);
		background: var(--panel);
		color: var(--text);
		cursor: pointer;
	}
	.lede { margin: 0 0 12px; color: var(--muted); }
	section {
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 16px;
		margin-bottom: 16px;
		background: var(--panel);
	}
	.badge {
		font-size: 11px;
		letter-spacing: .04em;
		padding: 2px 8px;
		border-radius: 999px;
		color: #fff;
	}
	.badge.false { background: #b4232b; }
	.badge.alias { background: #9a6300; }
	.variants { display: flex; flex-wrap: wrap; gap: 12px; }
	.variant {
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 12px;
		background: var(--bg);
		flex: 0 0 auto;
	}
	.variant header { display: flex; gap: 10px; align-items: baseline; margin-bottom: 8px; }
	.gid { font-size: 12px; }
	.hint { font-size: 12px; color: var(--muted); }
	.icons { display: flex; flex-wrap: wrap; gap: 12px; }
	figure { margin: 0; width: 148px; }
	.art {
		display: grid;
		place-items: center;
		height: 96px;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--art-bg);
		color: var(--text);
	}
	.art svg { width: 56px; height: 56px; display: block; }
	figcaption { margin-top: 6px; }
	.filename { font-size: 11px; word-break: break-all; display: block; }
	.paints { margin: 6px 0 0; font-size: 11px; display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
	.paints.muted { color: var(--muted); }
	.swatch {
		width: 10px;
		height: 10px;
		border-radius: 2px;
		border: 1px solid var(--border);
		display: inline-block;
	}
	code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
</style>
</head>
<body>
	<h1>Icon dedupe contact sheet</h1>
	<div class="toolbar">
		<p class="lede" style="margin:0">${plural(
			falseDupes.length,
			'false-duplicate group',
		)} across ${plural(collisions.size, 'name')} &middot; ${plural(
			aliases.length,
			'alias group',
		)}</p>
		<button type="button" id="theme">Toggle background</button>
	</div>
	${body}
	<script>
		const root = document.documentElement;
		document.getElementById('theme').addEventListener('click', () => {
			root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
		});
	</script>
</body>
</html>
`;
}

// ─── Report mode ────────────────────────────────────────────────────────

function runReport() {
	const { files, unreadable } = scanIcons();

	if (files.length === 0 && unreadable.length === 0) {
		console.error(`No SVG files found in ${sourcePath}`);
		process.exit(1);
	}

	const groups = buildGroups(files);
	const fileIndex = new Map(files.map((f) => [f.path, f]));
	const flagged = files.filter((f) => f.hardcodedPaints.length > 0);
	const notColorable = files.filter((f) => !f.colorable);

	const counts = {
		CLEAN: 0,
		TRUE_DUPLICATE: 0,
		ALIAS: 0,
		FALSE_DUPLICATE: 0,
	};

	for (const group of groups) counts[group.classification]++;

	const report = {
		generatedAt: new Date().toISOString(),
		source: args.source,
		summary: {
			totalFiles: files.length,
			totalGroups: groups.length,
			clean: counts.CLEAN,
			trueDuplicate: counts.TRUE_DUPLICATE,
			alias: counts.ALIAS,
			falseDuplicate: counts.FALSE_DUPLICATE,
			filesMarkedForRemoval: groups.reduce(
				(sum, g) => sum + g.remove.length,
				0,
			),
			awaitingCanonicalName: groups.filter((g) => g.needsCanonicalName).length,
			hardcodedFillIcons: flagged.length,
			notColorableIcons: notColorable.length,
		},
		groups,
		hardcodedFills: flagged.map((f) => ({
			path: f.path,
			paints: f.hardcodedPaints,
			usesCurrentColor: f.usesCurrentColor,
		})),
		// Icons that will not track CSS `color`, including ones that carry no
		// paint at all and simply inherit the black default.
		notColorable: notColorable.map((f) => ({
			path: f.path,
			paints: f.hardcodedPaints,
			reason:
				f.hardcodedPaints.length > 0
					? 'hardcoded paint'
					: 'no currentColor — inherits default black',
		})),
		unreadable,
	};

	mkdirSync(dirname(reportPath), { recursive: true });
	writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

	mkdirSync(dirname(contactSheetPath), { recursive: true });
	writeFileSync(contactSheetPath, buildContactSheet(groups, fileIndex));

	// ── Summary ──
	console.log('─'.repeat(64));
	console.log('  DRY RUN — no files were changed\n');
	console.log(`  Source:              ${sourcePath}`);
	console.log(`  SVGs scanned:        ${files.length}`);
	console.log(`  Groups:              ${groups.length}\n`);
	console.log(`  CLEAN:               ${counts.CLEAN}`);
	console.log(`  TRUE_DUPLICATE:      ${counts.TRUE_DUPLICATE}`);
	console.log(`  ALIAS:               ${counts.ALIAS}`);
	console.log(`  FALSE_DUPLICATE:     ${counts.FALSE_DUPLICATE}\n`);
	console.log(
		`  Hardcoded fills:     ${flagged.length} icon(s) with baked-in paint`,
	);
	console.log(
		`  Not CSS-colorable:   ${notColorable.length} icon(s) need a currentColor decision`,
	);
	console.log(
		`  Files to remove:     ${report.summary.filesMarkedForRemoval}`,
	);
	console.log(
		`  Awaiting a name:     ${report.summary.awaitingCanonicalName} group(s)`,
	);

	if (unreadable.length > 0) {
		console.log(`\n  Unreadable (skipped): ${unreadable.length}`);
		for (const entry of unreadable) {
			console.log(`    ! ${entry.path} — ${entry.reason}`);
		}
	}

	console.log('\n' + '─'.repeat(64));
	console.log(`  Report:        ${reportPath}`);
	console.log(`  Contact sheet: ${contactSheetPath}`);

	if (report.summary.awaitingCanonicalName > 0) {
		console.log(
			`\n  Fill in the empty "canonicalName" fields, then re-run with --apply.`,
		);
	} else {
		console.log(`\n  Nothing is awaiting a name — safe to re-run with --apply.`);
	}

	console.log();
}

// ─── Apply mode ─────────────────────────────────────────────────────────

function runApply() {
	if (!existsSync(reportPath)) {
		console.error(`Report not found: ${reportPath}`);
		console.error('Run without --apply first to generate it.');
		process.exit(1);
	}

	const report = JSON.parse(readFileSync(reportPath, 'utf-8'));
	const errors = [];
	const plan = [];
	const targets = new Map();

	for (const group of report.groups ?? []) {
		if (group.classification === 'CLEAN') continue;

		const canonicalName = String(group.canonicalName ?? '').trim();

		if (group.needsCanonicalName && canonicalName === '') {
			errors.push(
				`Group ${group.id} (${group.classification}, ${group.baseNames.join(
					', ',
				)}) still has an empty canonicalName.`,
			);
			continue;
		}

		const kebab = toKebabCase(basename(canonicalName, '.svg'));

		if (kebab === '') {
			errors.push(
				`Group ${group.id}: canonicalName "${canonicalName}" does not reduce to a usable kebab-case name.`,
			);
			continue;
		}

		// Renames always land in the flat root — this is how an icon gets
		// promoted out of duplicates/.
		const targetRel = `${kebab}.svg`;
		const targetAbs = resolve(sourcePath, targetRel);
		const keepAbs = resolve(sourcePath, group.keep);

		if (!existsSync(keepAbs)) {
			errors.push(`Group ${group.id}: keeper is missing on disk (${group.keep}).`);
			continue;
		}

		// A stale report would happily delete the wrong file. Re-fingerprint the
		// keeper and bail if the directory has moved on since the scan.
		try {
			const currentHash = hashOf(
				normalize(readFileSync(keepAbs, 'utf-8'), keepAbs),
			);

			if (currentHash !== group.hash) {
				errors.push(
					`Group ${group.id}: ${group.keep} has changed since the report was generated. Re-run without --apply.`,
				);
				continue;
			}
		} catch (error) {
			errors.push(`Group ${group.id}: could not read ${group.keep} — ${error.message}`);
			continue;
		}

		if (targets.has(targetRel)) {
			errors.push(
				`Name collision: groups ${targets.get(
					targetRel,
				)} and ${group.id} both resolve to "${targetRel}".`,
			);
			continue;
		}

		targets.set(targetRel, group.id);

		const missing = (group.remove ?? []).filter(
			(rel) => !existsSync(resolve(sourcePath, rel)),
		);

		if (missing.length > 0) {
			errors.push(
				`Group ${group.id}: marked for removal but missing on disk — ${missing.join(
					', ',
				)}.`,
			);
			continue;
		}

		plan.push({
			id: group.id,
			classification: group.classification,
			remove: group.remove ?? [],
			from: group.keep,
			to: targetRel,
			renames: group.keep !== targetRel,
		});
	}

	if (errors.length > 0) {
		console.error('─'.repeat(64));
		console.error(`  Refusing to apply — ${errors.length} problem(s):\n`);
		for (const error of errors) console.error(`    ! ${error}`);
		console.error('\n  Nothing was changed.');
		console.error('─'.repeat(64));
		process.exit(1);
	}

	// Removals first, so a promoted icon can take a name freed up in this pass.
	let removed = 0;
	let renamed = 0;

	for (const step of plan) {
		for (const rel of step.remove) {
			rmSync(resolve(sourcePath, rel));
			console.log(`  [DEL]    ${rel}`);
			removed++;
		}
	}

	for (const step of plan) {
		if (!step.renames) continue;
		renameSync(resolve(sourcePath, step.from), resolve(sourcePath, step.to));
		console.log(`  [RENAME] ${step.from} → ${step.to}`);
		renamed++;
	}

	console.log('\n' + '─'.repeat(64));
	console.log(`  Groups applied:  ${plan.length}`);
	console.log(`  Files removed:   ${removed}`);
	console.log(`  Files renamed:   ${renamed}`);
	console.log(
		`\n  Re-run without --apply to regenerate the report against the new state.`,
	);
	console.log();
}

// ─── Main ───────────────────────────────────────────────────────────────

if (!existsSync(sourcePath)) {
	console.error(`Source directory not found: ${sourcePath}`);
	process.exit(1);
}

if (args.apply) {
	runApply();
} else {
	runReport();
}
