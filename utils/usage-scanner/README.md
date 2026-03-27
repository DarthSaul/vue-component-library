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
		"uniqueComponents": 8,
		"totalComponentImports": 47,
		"uniqueIcons": 23,
		"totalIconImports": 89
	},
	"components": {
		"Button": {
			"count": 23,
			"files": [
				{ "path": "src/views/Login.vue", "localName": "Button" },
				{ "path": "src/components/Toolbar.vue", "localName": "Button" }
			]
		}
	},
	"icons": {
		"check-circle": {
			"count": 15,
			"files": [
				{ "path": "src/views/Login.vue", "localName": "CheckCircle" }
			]
		}
	}
}
```

Imports from subpaths starting with `/styles` are silently skipped — only `components` and `icons` are reported.

### HTML Report

When using `--format html`, the scanner generates a self-contained HTML file (no external dependencies) that includes:

- Summary stats (unique components, total imports)
- Horizontal bar chart showing relative import distribution
- Component table with expandable file lists

If no `--output` path is specified, the report is written to `dist/reports/{repoName}-usage-report.html`.

## What It Detects

- Named imports: `import { Button, Input } from '@pvt-scope/pkg-name'`
- Renamed imports: `import { Button as PreButton } from '@pvt-scope/pkg-name'`
- Deep path imports: `import Button from '@pvt-scope/pkg-name/components/Button'`
- Default imports: `import LibName from '@pvt-scope/pkg-name'`
- Namespace imports: `import * as LibName from '@pvt-scope/pkg-name'`
- `.vue`, `.js`, and `.ts` files (including `<script setup>`)

## Dashboard

A Vite + Vue SPA lives in `dashboard-app/` for visualizing scan reports in the browser. It reads from `report-data/` — drop JSON reports there, regenerate the manifest, and the dashboard loads all of them with a tab per project.

### Setup

```bash
cd dashboard-app
npm install
npm run dev   # http://localhost:5173
```

### Adding reports

```bash
# 1. Scan each project, writing output into report-data/
node src/cli.js --target /path/to/project-a --package @pvt-scope/pkg-name \
  --pretty --output report-data/project-a.json

node src/cli.js --target /path/to/project-b --package @pvt-scope/pkg-name \
  --pretty --output report-data/project-b.json

# 2. Regenerate the manifest so the dashboard picks up the new files
npm run build-manifest

# 3. Open or refresh the dashboard
```

`npm run build-manifest` scans `report-data/` for `*.json` files and writes `report-data/manifest.json`. Re-run it any time you add, rename, or remove a report file.

### How it works

- `report-data/manifest.json` — array of filenames the dashboard should load
- The dashboard fetches the manifest on mount, then fetches every listed file in parallel
- Each report becomes a tab, labeled by `repoName`
- `manifest.json` and all report files are served as static assets by Vite during development

## Running Tests

```bash
npm test
```

## Roadmap

- [ ] Template AST scanning (detect `<Button>` / `<r-button>` in templates)
- [ ] Scheduled GitHub Actions pipeline for automated scanning
- [x] HTML report generation (`--format html`)
- [x] Dashboard SPA for multi-project report visualization (`dashboard-app/`)
- [ ] Multi-repo batch scanning with config file
- [ ] Trend tracking via timestamped report persistence
