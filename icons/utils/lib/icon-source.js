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

/** Resolve a user-supplied path against icons/ unless it is already absolute. */
export function fromIconsRoot(path) {
	return isAbsolute(path) ? path : resolve(iconsRoot, path);
}

/**
 * Resolve the icon directory from an explicit --source. There is no fallback
 * and no search: the caller says where the icons are, or the script stops.
 *
 * A relative --source is resolved against icons/, not the cwd, so a given
 * command means the same thing from the repo root, from a workspace, or from a
 * CI step. Absolute paths are used as given.
 */
export function resolveIconSource(override) {
	if (!override) {
		throw new Error(
			'Missing required --source <dir>.\n' +
				'  Relative paths resolve against icons/ ' +
				'(e.g. --source ../flat-icons for <repo>/flat-icons).',
		);
	}

	const path = fromIconsRoot(override);

	if (!existsSync(path)) {
		throw new Error(`Icon directory not found: ${path}`);
	}

	return path;
}
