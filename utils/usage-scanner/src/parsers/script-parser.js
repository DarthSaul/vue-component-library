import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';

// Handle CJS default export interop in ESM context
const traverse = _traverse.default ?? _traverse;

/**
 * Parse a script string and extract all named imports from the target package.
 *
 * Handles:
 * - Named imports:    import { Button } from '@pvt-scope/pkg-name'
 * - Renamed imports:  import { Button as PreButton } from '@pvt-scope/pkg-name'
 * - Default imports:  import LibName from '@pvt-scope/pkg-name'
 * - Deep imports:     import Button from '@pvt-scope/pkg-name/components/Button'
 *
 * @param {string} code - The script source code.
 * @param {object} options
 * @param {string} options.packageName - The package to match against.
 * @param {boolean} [options.isTS=false] - Whether to enable TypeScript parsing.
 * @returns {import('./scanner.js').ImportedComponent[]}
 */
export function extractImportsFromScript(code, { packageName, isTS = false }) {
	let ast;

	try {
		ast = parse(code, {
			sourceType: 'module',
			plugins: ['jsx', ...(isTS ? ['typescript'] : [])],
		});
	} catch {
		// Gracefully skip unparseable files
		return [];
	}

	/** @type {import('../scanner.js').ImportedComponent[]} */
	const results = [];

	traverse(ast, {
		ImportDeclaration(path) {
			const source = path.node.source.value;

			if (!isTargetPackage(source, packageName)) {
				return;
			}

			for (const specifier of path.node.specifiers) {
				switch (specifier.type) {
					case 'ImportSpecifier': {
						// import { Button } or import { Button as PreButton }
						const componentName =
							specifier.imported.name;
						const localName =
							specifier.local.name;
						results.push({
							componentName,
							localName,
						});
						break;
					}

					case 'ImportDefaultSpecifier': {
						// import LibName from '...' or import Button from '.../Button'
						const inferredName =
							inferComponentFromDeepImport(
								source,
								packageName,
							);
						results.push({
							componentName:
								inferredName ??
								specifier.local
									.name,
							localName: specifier
								.local.name,
						});
						break;
					}

					case 'ImportNamespaceSpecifier': {
						// import * as LibName from '...' — track as namespace usage
						results.push({
							componentName: '*',
							localName: specifier
								.local.name,
						});
						break;
					}
				}
			}
		},
	});

	return results;
}

/**
 * Check whether an import source matches the target package.
 * Matches both exact (`@pvt-scope/pkg-name`) and deep imports
 * (`@pvt-scope/pkg-name/components/Button`).
 *
 * @param {string} source - The import source string.
 * @param {string} packageName - The target package name.
 * @returns {boolean}
 */
function isTargetPackage(source, packageName) {
	return source === packageName || source.startsWith(`${packageName}/`);
}

/**
 * For deep imports like `@pvt-scope/pkg-name/components/Button`,
 * infer the component name from the final path segment.
 *
 * @param {string} source
 * @param {string} packageName
 * @returns {string | null}
 */
function inferComponentFromDeepImport(source, packageName) {
	if (source === packageName) {
		return null;
	}

	const deepPath = source.slice(packageName.length + 1);
	const segments = deepPath.split('/');
	return segments[segments.length - 1] ?? null;
}
