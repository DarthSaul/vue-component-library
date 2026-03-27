#!/usr/bin/env node

/**
 * Scans report-data/ for *.json files and writes manifest.json.
 * Run this after adding or removing report files:
 *
 *   npm run build-manifest
 */

import { readdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const reportDataDir = resolve(__dirname, '../report-data');

const files = readdirSync(reportDataDir)
  .filter((f) => f.endsWith('.json') && f !== 'manifest.json')
  .sort();

const manifestPath = resolve(reportDataDir, 'manifest.json');
writeFileSync(manifestPath, JSON.stringify(files, null, 2) + '\n', 'utf-8');

console.log(`manifest.json updated with ${files.length} report(s):`);
files.forEach((f) => console.log(`  ${f}`));
