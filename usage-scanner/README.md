# @pvt-scope/usage-scanner

AST-based component usage scanner for `@pvt-scope` packages. Scans consuming repositories to produce structured reports of which components are imported and where.

## Quick Start

```bash
npm install

# Scan a local repo
node src/cli.js --target /path/to/consuming-repo --pretty

# Scan for a different package
node src/cli.js --target /path/to/repo --package @pvt-scope/diff-pkg-name

# Write output to a file
node src/cli.js --target /path/to/repo --output report.json --pretty

# Generate an HTML report viewable in the browser
node src/cli.js --target /path/to/repo --format html

# HTML report with custom output path
node src/cli.js --target /path/to/repo --format html --output my-report.html
```

## CLI Options

| Flag                   | Description                        | Default               |
| ---------------------- | ---------------------------------- | --------------------- |
| `-t, --target <path>`  | Path to the repository to scan     | _required_            |
| `-p, --package <name>` | Package name to scan for           | `@pvt-scope/pkg-name` |
| `-o, --output <path>`  | Output file path (omit for stdout) | —                     |
| `-f, --format <type>`  | Output format: `json` or `html`    | `json`                |
| `--pretty`             | Pretty-print JSON output           | `false`               |

## Output Format

```json
{
	"repoName": "my-app",
	"packageName": "@pvt-scope/pkg-name",
	"scannedAt": "2026-03-19T15:00:00.000Z",
	"summary": {
		"uniqueComponents": 12,
		"totalImports": 87
	},
	"components": {
		"Button": {
			"count": 23,
			"files": [
				{
					"path": "src/views/Login.vue",
					"localName": "Button"
				},
				{
					"path": "src/components/Toolbar.vue",
					"localName": "Button"
				}
			]
		}
	}
}
```

### HTML Report

When using `--format html`, the scanner generates a self-contained HTML file (no external dependencies) that includes:

- Summary stats (unique components, total imports)
- Horizontal bar chart showing relative import distribution
- Component table with expandable file lists

If no `--output` path is specified, the report is written to `{repoName}-usage-report.html` in the current directory.

## What It Detects

- Named imports: `import { Button, Input } from '@pvt-scope/pkg-name'`
- Renamed imports: `import { Button as PreButton } from '@pvt-scope/pkg-name'`
- Deep path imports: `import Button from '@pvt-scope/pkg-name/components/Button'`
- Default imports: `import LibName from '@pvt-scope/pkg-name'`
- Namespace imports: `import * as LibName from '@pvt-scope/pkg-name'`
- `.vue`, `.js`, and `.ts` files (including `<script setup>`)

## Running Tests

```bash
npm test
```

## Roadmap

- [ ] Template AST scanning (detect `<Button>` / `<r-button>` in templates)
- [ ] Scheduled GitHub Actions pipeline for automated scanning
- [x] HTML report generation (`--format html`)
- [ ] Dashboard integration in LibName docs SPA
- [ ] Multi-repo batch scanning with config file
- [ ] Trend tracking via timestamped report persistence
