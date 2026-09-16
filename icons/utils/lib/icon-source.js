/**
 * icon-source.js
 *
 * Locates the canonical icon directory. Both CLIs resolve it the same way, and
 * always against the script's own location rather than the cwd, so they behave
 * identically whether run from the repo root, from icons/, or from a CI step.
 */

import { existsSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/** The icons/ workspace root — this file lives at icons/utils/lib/. */
export const iconsRoot = resolve(here, '..', '..');

/** The repository root. */
export const repoRoot = resolve(iconsRoot, '..');

/** Resolve a user-supplied path against icons/ unless it is already absolute. */
export function fromIconsRoot(path) {
	return isAbsolute(path) ? path : resolve(iconsRoot, path);
}

/**
 * Find flat-icons/. Checked in a fixed order so the result never depends on
 * the cwd: icons/flat-icons first, then a repo-root flat-icons.
 */
export function resolveIconSource(override) {
	if (override) {
		const path = fromIconsRoot(override);

		if (!existsSync(path)) {
			throw new Error(`Icon directory not found: ${path}`);
		}

		return path;
	}

	const candidates = [
		resolve(iconsRoot, 'flat-icons'),
		resolve(repoRoot, 'flat-icons'),
	];

	for (const candidate of candidates) {
		if (existsSync(candidate)) return candidate;
	}

	throw new Error(
		`Icon directory not found. Looked in:\n${candidates
			.map((candidate) => `  ${candidate}`)
			.join('\n')}\nPass --source <dir> to point somewhere else.`,
	);
}
