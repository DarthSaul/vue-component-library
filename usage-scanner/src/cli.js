#!/usr/bin/env node

import { Command } from 'commander';
import { scanRepository } from './scanner.js';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const program = new Command();

program.name('usage-scanner')
	.description('Scan a repository for @pvt-scope package component usage')
	.requiredOption('-t, --target <path>', 'Path to the repository to scan')
	.option(
		'-p, --package <name>',
		'Package name to scan for',
		'@pvt-scope/pkg-name',
	)
	.option('-o, --output <path>', 'Output file path (defaults to stdout)')
	.option('--pretty', 'Pretty-print JSON output', false)
	.action(async (options) => {
		const targetPath = resolve(options.target);

		try {
			const report = await scanRepository(targetPath, {
				packageName: options.package,
			});

			const json = options.pretty
				? JSON.stringify(report, null, 2)
				: JSON.stringify(report);

			if (options.output) {
				const outputPath = resolve(options.output);
				writeFileSync(outputPath, json, 'utf-8');
				console.log(`Report written to ${outputPath}`);
			} else {
				console.log(json);
			}
		} catch (error) {
			console.error(`Scan failed: ${error.message}`);
			process.exit(1);
		}
	});

program.parse();
