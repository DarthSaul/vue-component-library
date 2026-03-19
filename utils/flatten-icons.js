#!/usr/bin/env node

/**
 * flatten-icons.js
 *
 * Recursively finds all .svg files in a source directory, copies them
 * to a flat output directory, and routes filename collisions to a
 * duplicates/ subdirectory with disambiguating suffixes.
 *
 * Usage:
 *   node flatten-icons.js --source icons/Icons --output output-dir
 *   node flatten-icons.js --source icons/Icons --output output-dir --dry-run
 *   node flatten-icons.js --source icons/Icons --output output-dir --kebab
 */

import {
	existsSync,
	mkdirSync,
	copyFileSync,
	readdirSync,
	statSync,
} from 'node:fs';
import { resolve, join, basename, extname, relative, dirname } from 'node:path';
import { parseArgs } from 'node:util';

// ─── CLI ────────────────────────────────────────────────────────────────

const { values: args } = parseArgs({
	options: {
		source: { type: 'string', short: 's' },
		output: { type: 'string', short: 'o' },
		'dry-run': { type: 'boolean', default: false },
		kebab: { type: 'boolean', default: false },
		help: { type: 'boolean', short: 'h', default: false },
	},
});

if (args.help || !args.source || !args.output) {
	console.log(`
Usage: node flatten-icons.js --source <dir> --output <dir> [options]

Options:
  -s, --source <dir>   Source directory to scan recursively
  -o, --output <dir>   Flat output directory for unique icons
  --kebab              Normalize filenames to kebab-case
  --dry-run            Print what would happen without copying files
  -h, --help           Show this help
  `);
	process.exit(args.help ? 0 : 1);
}

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Convert a filename to kebab-case.
 * Handles: PascalCase, camelCase, snake_case, spaces, dots (except extension).
 *
 * Examples:
 *   "CheckCircle.svg"     → "check-circle.svg"
 *   "arrow_left_bold.svg" → "arrow-left-bold.svg"
 *   "My Icon (1).svg"     → "my-icon-1.svg"
 *   "ICONBig.svg"         → "icon-big.svg"
 */
function toKebabCase(filename) {
	const ext = extname(filename);
	const name = basename(filename, ext);

	const kebab = name
		// Insert hyphen between lowercase/digit and uppercase: "checkCircle" → "check-Circle"
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		// Insert hyphen between consecutive uppercase and lowercase: "ICONBig" → "ICON-Big"
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
		// Replace underscores, spaces, dots, and other separators with hyphens
		.replace(/[\s_.()]+/g, '-')
		// Remove any non-alphanumeric characters except hyphens
		.replace(/[^a-zA-Z0-9-]/g, '')
		// Collapse multiple hyphens
		.replace(/-+/g, '-')
		// Trim leading/trailing hyphens
		.replace(/^-|-$/g, '')
		.toLowerCase();

	return `${kebab}${ext}`;
}

/**
 * Recursively find all .svg files in a directory.
 */
function findSvgFiles(dir) {
	const results = [];

	for (const entry of readdirSync(dir)) {
		const fullPath = join(dir, entry);
		const stat = statSync(fullPath);

		if (stat.isDirectory()) {
			results.push(...findSvgFiles(fullPath));
		} else if (entry.toLowerCase().endsWith('.svg')) {
			results.push(fullPath);
		}
	}

	return results;
}

const seenDuplicates = new Set();

/**
 * Generate a unique filename for the duplicates folder.
 * Appends the parent folder name, then falls back to numeric suffixes.
 *
 * Example progression for "check.svg" collisions:
 *   1st copy → check--from-actions.svg
 *   2nd copy → check--from-navigation.svg
 *   3rd copy (same parent) → check--from-navigation-2.svg
 */
function getUniqueFilename(targetDir, originalName, sourcePath) {
	const ext = extname(originalName);
	const stem = basename(originalName, ext);

	// First attempt: append the source folder name for context
	const parentFolder = basename(dirname(sourcePath));
	const folderSuffix = args.kebab
		? toKebabCase(`${parentFolder}.tmp`).replace('.tmp', '')
		: parentFolder.toLowerCase().replace(/[^a-z0-9]/g, '-');

	let candidate = `${stem}--from-${folderSuffix}${ext}`;

	if (
		!seenDuplicates.has(candidate) &&
		!existsSync(join(targetDir, candidate))
	) {
		seenDuplicates.add(candidate);
		return candidate;
	}

	// Fallback: numeric suffix
	let counter = 2;
	while (
		seenDuplicates.has(candidate) ||
		existsSync(join(targetDir, candidate))
	) {
		candidate = `${stem}--from-${folderSuffix}-${counter}${ext}`;
		counter++;
	}

	seenDuplicates.add(candidate);
	return candidate;
}

// ─── Main ───────────────────────────────────────────────────────────────

const sourcePath = resolve(args.source);
const outputPath = resolve(args.output);
const dupsPath = join(outputPath, 'duplicates');
const isDryRun = args['dry-run'];

if (!existsSync(sourcePath)) {
	console.error(`Source directory not found: ${sourcePath}`);
	process.exit(1);
}

if (!isDryRun) {
	mkdirSync(outputPath, { recursive: true });
	mkdirSync(dupsPath, { recursive: true });
}

const svgFiles = findSvgFiles(sourcePath);

console.log(`Found ${svgFiles.length} SVG files in ${sourcePath}\n`);

const stats = { unique: 0, duplicate: 0 };
const report = [];
const seen = new Set();

for (const svgPath of svgFiles) {
	const relSource = relative(sourcePath, svgPath);
	const originalName = basename(svgPath);
	const targetName = args.kebab
		? toKebabCase(originalName)
		: originalName;
	const targetFile = join(outputPath, targetName);
	const isCollision =
		seen.has(targetName) || (!isDryRun && existsSync(targetFile));

	if (!isCollision) {
		// Unique — goes to output root
		seen.add(targetName);

		if (!isDryRun) {
			copyFileSync(svgPath, targetFile);
		}

		report.push({
			source: relSource,
			targetName,
			destination: 'output',
		});

		stats.unique++;
	} else {
		// Collision — goes to duplicates/ with a disambiguating name
		const dupName = getUniqueFilename(
			dupsPath,
			targetName,
			svgPath,
		);

		if (!isDryRun) {
			const dupFile = join(dupsPath, dupName);
			copyFileSync(svgPath, dupFile);
		}

		report.push({
			source: relSource,
			targetName: `duplicates/${dupName}`,
			destination: 'duplicate',
			collidedWith: targetName,
		});

		stats.duplicate++;
	}
}

// ─── Summary ────────────────────────────────────────────────────────────

console.log('─'.repeat(60));
console.log(isDryRun ? '  DRY RUN — no files were copied\n' : '');

for (const entry of report) {
	const tag = entry.destination === 'duplicate' ? '[DUP]' : '[OK] ';
	console.log(`  ${tag} ${entry.source} → ${entry.targetName}`);
}

console.log('\n' + '─'.repeat(60));
console.log(`  Total SVGs found:  ${svgFiles.length}`);
console.log(`  Unique (copied):   ${stats.unique}`);
console.log(`  Duplicates:        ${stats.duplicate}`);

if (stats.duplicate > 0) {
	console.log(`\n  Review duplicates in: ${dupsPath}`);
	console.log(
		'  Each duplicate is suffixed with its source folder name for context.',
	);
	console.log(
		'  Visually compare with the original, then either discard or rename and promote.',
	);
}

console.log();
