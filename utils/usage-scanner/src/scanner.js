import fg from 'fast-glob';
import { readFileSync } from 'node:fs';
import { basename, relative } from 'node:path';
import { parse as parseSFC } from '@vue/compiler-sfc';
import { extractImportsFromScript } from './parsers/script-parser.js';

/**
 * Scan a repository for component imports from a target package.
 *
 * @param {string} repoPath - Absolute path to the repository root.
 * @param {object} options
 * @param {string} options.packageName - The npm package to scan for (e.g., '@pvt-scope/pkg-name').
 * @returns {Promise<ScanReport>}
 */
export async function scanRepository(repoPath, { packageName }) {
  const files = await discoverFiles(repoPath);

  /** @type {Map<string, ComponentUsage>} */
  const components = new Map();

  for (const filePath of files) {
    const relPath = relative(repoPath, filePath);
    const source = readFileSync(filePath, 'utf-8');
    const imports = extractImportsFromFile(filePath, source, packageName);

    for (const imported of imports) {
      const existing = components.get(imported.componentName) ?? {
        count: 0,
        files: [],
      };

      existing.count += 1;
      existing.files.push({
        path: relPath,
        localName: imported.localName,
      });

      components.set(imported.componentName, existing);
    }
  }

  return buildReport(repoPath, packageName, components);
}

/**
 * Discover all scannable files in the target repo.
 *
 * @param {string} repoPath
 * @returns {Promise<string[]>}
 */
async function discoverFiles(repoPath) {
  return fg(['**/*.vue', '**/*.js', '**/*.ts'], {
    cwd: repoPath,
    absolute: true,
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.nuxt/**',
      '**/*.spec.*',
      '**/*.test.*',
      '**/*.d.ts',
      '**/vite.config.*',
      '**/vitest.config.*',
    ],
  });
}

/**
 * Extract imports from a single file, handling both .vue SFCs and plain scripts.
 *
 * @param {string} filePath
 * @param {string} source
 * @param {string} packageName
 * @returns {ImportedComponent[]}
 */
function extractImportsFromFile(filePath, source, packageName) {
  if (filePath.endsWith('.vue')) {
    return extractFromVueSFC(source, packageName);
  }

  // .js / .ts file — parse directly as script
  const isTS = filePath.endsWith('.ts');
  return extractImportsFromScript(source, { packageName, isTS });
}

/**
 * Parse a .vue SFC and extract imports from its script block(s).
 *
 * @param {string} source
 * @param {string} packageName
 * @returns {ImportedComponent[]}
 */
function extractFromVueSFC(source, packageName) {
  const { descriptor, errors } = parseSFC(source);

  if (errors.length > 0) {
    // Gracefully skip unparseable SFCs
    return [];
  }

  const results = [];

  // Handle <script setup> (preferred) and <script> blocks
  const scriptBlocks = [descriptor.scriptSetup, descriptor.script].filter(
    Boolean,
  );

  for (const block of scriptBlocks) {
    const isTS = block.lang === 'ts';
    const imports = extractImportsFromScript(block.content, {
      packageName,
      isTS,
    });
    results.push(...imports);
  }

  return results;
}

/**
 * Build the final report object.
 *
 * @param {string} repoPath
 * @param {string} packageName
 * @param {Map<string, ComponentUsage>} components
 * @returns {ScanReport}
 */
function buildReport(repoPath, packageName, components) {
  const componentEntries = Object.fromEntries(
    [...components.entries()].sort(([a], [b]) => a.localeCompare(b)),
  );

  const totalImports = [...components.values()].reduce(
    (sum, c) => sum + c.count,
    0,
  );

  return {
    repoName: basename(repoPath),
    packageName,
    scannedAt: new Date().toISOString(),
    summary: {
      uniqueComponents: components.size,
      totalImports,
    },
    components: componentEntries,
  };
}

/**
 * @typedef {object} ImportedComponent
 * @property {string} componentName - The exported name from the package.
 * @property {string} localName - The local binding name (may differ if renamed).
 */

/**
 * @typedef {object} ComponentUsage
 * @property {number} count
 * @property {{ path: string, localName: string }[]} files
 */

/**
 * @typedef {object} ScanReport
 * @property {string} repoName
 * @property {string} packageName
 * @property {string} scannedAt
 * @property {{ uniqueComponents: number, totalImports: number }} summary
 * @property {Record<string, ComponentUsage>} components
 */
