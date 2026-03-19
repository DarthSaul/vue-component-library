#!/usr/bin/env node

import { Command } from 'commander';
import { scanRepository } from './scanner.js';
import { generateHtmlReport } from './reporters/html-reporter.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

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
	.option('-f, --format <type>', 'Output format: json or html', 'json')
	.option('--pretty', 'Pretty-print JSON output', false)
	.action(async (options) => {
		const targetPath = resolve(options.target);

		try {
			const report = await scanRepository(targetPath, {
				packageName: options.package,
			});

			if (options.format === 'html') {
				const html = generateHtmlReport(report);
				const outputPath = options.output
					? resolve(options.output)
					: resolve('dist/reports', `${report.repoName}-usage-report.html`);
				mkdirSync(dirname(outputPath), { recursive: true });
				writeFileSync(outputPath, html, 'utf-8');
				console.log(`HTML report written to ${outputPath}`);
			} else {
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
			}
		} catch (error) {
			console.error(`Scan failed: ${error.message}`);
			process.exit(1);
		}
	});

program.parse();
