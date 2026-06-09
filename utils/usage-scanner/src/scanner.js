import fg from 'fast-glob';
import { readFileSync } from 'node:fs';
import { basename, relative } from 'node:path';
import { parse as parseSFC } from '@vue/compiler-sfc';
import { extractImportsFromScript } from './parsers/script-parser.js';
import { countComponentTags, normalizeTagName } from './parsers/template-parser.js';

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
  /** @type {Map<string, ComponentUsage>} */
  const icons = new Map();

  for (const filePath of files) {
    const relPath = relative(repoPath, filePath);
    const source = readFileSync(filePath, 'utf-8');
    const imports = extractImportsFromFile(filePath, source, packageName);

    for (const imported of imports) {
      const category = categorizeImport(imported.source, packageName);

      // Skip styles — we don't report on them
      if (category === 'styles') {
        continue;
      }

      const targetMap = category === 'icons' ? icons : components;
      const existing = targetMap.get(imported.componentName) ?? {
        count: 0,
        templateUses: 0,
        files: [],
      };

      existing.count += 1;

      const fileEntry = { path: relPath, localName: imported.localName };

      if (category === 'components') {
        const uses = imported.templateUses ?? 0;
        existing.templateUses += uses;
        fileEntry.templateUses = uses;
      }

      existing.files.push(fileEntry);
      targetMap.set(imported.componentName, existing);
    }
  }

  return buildReport(repoPath, packageName, components, icons);
}

/**
 * Determine the import category based on the source path.
 *
 * @param {string} source - The full import source string.
 * @param {string} packageName - The target package name.
 * @returns {'icons' | 'components' | 'styles'}
 */
function categorizeImport(source, packageName) {
  const subpath = source.slice(packageName.length);

  if (subpath.startsWith('/icons')) {
    return 'icons';
  }

  if (subpath.startsWith('/styles')) {
    return 'styles';
  }

  // Everything else: root imports, /ui, /button, /dropdown, etc.
  return 'components';
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

  // .js / .ts file — parse directly as script; no template, so templateUses stays 0
  const isTS = filePath.endsWith('.ts');
  return extractImportsFromScript(source, { packageName, isTS }).map((imp) => ({
    ...imp,
    templateUses: 0,
  }));
}

/**
 * Parse a .vue SFC and extract imports from its script block(s),
 * then annotate each import with how many times it is used as a tag
 * in the SFC's template block.
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

  // Count component tag occurrences in the template
  const tagCounts = countComponentTags(descriptor.template?.content ?? '');

  // Attach templateUses to each import, deduped by localName to avoid
  // double-counting when the same component is imported in both script blocks
  const credited = new Set();
  for (const imp of results) {
    if (!credited.has(imp.localName)) {
      imp.templateUses = tagCounts.get(normalizeTagName(imp.localName)) ?? 0;
      credited.add(imp.localName);
    } else {
      imp.templateUses = 0;
    }
  }

  return results;
}

/**
 * Build the final report object.
 *
 * @param {string} repoPath
 * @param {string} packageName
 * @param {Map<string, ComponentUsage>} components
 * @param {Map<string, ComponentUsage>} icons
 * @returns {ScanReport}
 */
function buildReport(repoPath, packageName, components, icons) {
  const sortEntries = (map) =>
    Object.fromEntries(
      [...map.entries()].sort(([a], [b]) => a.localeCompare(b)),
    );

  const sumCounts = (map) =>
    [...map.values()].reduce((sum, c) => sum + c.count, 0);

  const sumTemplateUses = (map) =>
    [...map.values()].reduce((sum, c) => sum + (c.templateUses ?? 0), 0);

  return {
    repoName: basename(repoPath),
    packageName,
    scannedAt: new Date().toISOString(),
    summary: {
      uniqueComponents: components.size,
      totalComponentImports: sumCounts(components),
      totalComponentUses: sumTemplateUses(components),
      uniqueIcons: icons.size,
      totalIconImports: sumCounts(icons),
    },
    components: sortEntries(components),
    icons: sortEntries(icons),
  };
}

/**
 * @typedef {object} ImportedComponent
 * @property {string} componentName - The exported name from the package.
 * @property {string} localName - The local binding name (may differ if renamed).
 * @property {string} source - The full import source string.
 * @property {number} [templateUses] - Times this import's localName appears as a tag in the SFC template.
 */

/**
 * @typedef {object} ComponentUsage
 * @property {number} count - Total import occurrences across the repo.
 * @property {number} templateUses - Total template tag occurrences across the repo (components only).
 * @property {{ path: string, localName: string, templateUses?: number }[]} files
 */

/**
 * @typedef {object} ScanReport
 * @property {string} repoName
 * @property {string} packageName
 * @property {string} scannedAt
 * @property {{ uniqueComponents: number, totalComponentImports: number, totalComponentUses: number, uniqueIcons: number, totalIconImports: number }} summary
 * @property {Record<string, ComponentUsage>} components
 * @property {Record<string, ComponentUsage>} icons
 */
