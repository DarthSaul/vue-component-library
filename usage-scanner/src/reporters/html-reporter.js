/**
 * Generate a self-contained HTML report from scan data.
 *
 * @param {import('../scanner.js').ScanReport} report
 * @returns {string} Complete HTML document string
 */
export function generateHtmlReport(report) {
	const components = Object.entries(report.components).sort(
		([, a], [, b]) => b.count - a.count,
	);
	const maxCount = components.length > 0 ? components[0][1].count : 0;
	const scanDate = new Date(report.scannedAt).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Usage Report — ${esc(report.repoName)}</title>
	<style>${CSS}</style>
</head>
<body>
	${renderHeader(report, scanDate)}
	<main>
		${renderChart(components, maxCount)}
		${renderTable(components)}
	</main>
	<script>${JS}</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Template helpers
// ---------------------------------------------------------------------------

function renderHeader(report, scanDate) {
	return `
	<header>
		<div class="title-row">
			<h1>${esc(report.repoName)}</h1>
			<span class="badge">${esc(report.packageName)}</span>
		</div>
		<p class="scan-date">Scanned ${esc(scanDate)}</p>
		<div class="stats">
			<div class="stat-card">
				<span class="stat-value">${report.summary.uniqueComponents}</span>
				<span class="stat-label">Components</span>
			</div>
			<div class="stat-card">
				<span class="stat-value">${report.summary.totalImports}</span>
				<span class="stat-label">Total imports</span>
			</div>
		</div>
	</header>`;
}

function renderChart(components, maxCount) {
	if (components.length === 0) return '';

	const bars = components
		.map(([name, usage]) => {
			const pct = maxCount > 0 ? (usage.count / maxCount) * 100 : 0;
			return `
			<div class="bar-row">
				<span class="bar-label">${esc(name)}</span>
				<div class="bar-track">
					<div class="bar-fill" style="width:${pct.toFixed(1)}%"></div>
				</div>
				<span class="bar-count">${usage.count}</span>
			</div>`;
		})
		.join('');

	return `
	<section class="chart">
		<h2>Import distribution</h2>
		${bars}
	</section>`;
}

function renderTable(components) {
	if (components.length === 0) {
		return '<p class="empty">No component imports found.</p>';
	}

	const rows = components
		.map(([name, usage], i) => {
			const fileRows = usage.files
				.map(
					(f) =>
						`<li><code>${esc(f.path)}</code>${f.localName !== name ? ` <span class="alias">as ${esc(f.localName)}</span>` : ''}</li>`,
				)
				.join('');

			return `
			<tr>
				<td class="comp-name">${esc(name)}</td>
				<td class="comp-count">${usage.count}</td>
				<td>
					<button class="toggle-btn" data-toggle="files-${i}">Show files</button>
				</td>
			</tr>
			<tr id="files-${i}" class="files-row hidden">
				<td colspan="3">
					<ul class="file-list">${fileRows}</ul>
				</td>
			</tr>`;
		})
		.join('');

	return `
	<section class="table-section">
		<h2>Components</h2>
		<table>
			<thead>
				<tr>
					<th>Component</th>
					<th>Imports</th>
					<th></th>
				</tr>
			</thead>
			<tbody>${rows}</tbody>
		</table>
	</section>`;
}

// ---------------------------------------------------------------------------
// Inline CSS
// ---------------------------------------------------------------------------

const CSS = `
	:root {
		--bg: #f8f9fa;
		--surface: #ffffff;
		--text: #1a1a2e;
		--text-muted: #6c757d;
		--accent: #4361ee;
		--accent-light: #e8ecff;
		--border: #dee2e6;
		--radius: 8px;
	}

	* { margin: 0; padding: 0; box-sizing: border-box; }

	body {
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
		background: var(--bg);
		color: var(--text);
		line-height: 1.6;
		padding: 2rem;
		max-width: 960px;
		margin: 0 auto;
	}

	header {
		margin-bottom: 2rem;
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	h1 {
		font-size: 1.75rem;
		font-weight: 700;
	}

	h2 {
		font-size: 1.15rem;
		font-weight: 600;
		margin-bottom: 1rem;
		color: var(--text);
	}

	.badge {
		font-size: 0.8rem;
		background: var(--accent-light);
		color: var(--accent);
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
		font-weight: 500;
	}

	.scan-date {
		color: var(--text-muted);
		font-size: 0.875rem;
		margin-top: 0.25rem;
	}

	.stats {
		display: flex;
		gap: 1rem;
		margin-top: 1.25rem;
	}

	.stat-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 1rem 1.5rem;
		display: flex;
		flex-direction: column;
	}

	.stat-value {
		font-size: 2rem;
		font-weight: 700;
		color: var(--accent);
		line-height: 1.2;
	}

	.stat-label {
		font-size: 0.8rem;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* Chart */
	.chart {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.bar-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.bar-label {
		width: 140px;
		font-size: 0.875rem;
		font-weight: 500;
		text-align: right;
		flex-shrink: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.bar-track {
		flex: 1;
		height: 22px;
		background: var(--accent-light);
		border-radius: 4px;
		overflow: hidden;
	}

	.bar-fill {
		height: 100%;
		background: var(--accent);
		border-radius: 4px;
		min-width: 2px;
		transition: width 0.3s ease;
	}

	.bar-count {
		width: 36px;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-muted);
		text-align: right;
		flex-shrink: 0;
	}

	/* Table */
	.table-section {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 1.5rem;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	thead th {
		text-align: left;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
		padding: 0.5rem 0.75rem;
		border-bottom: 2px solid var(--border);
	}

	tbody td {
		padding: 0.65rem 0.75rem;
		border-bottom: 1px solid var(--border);
		font-size: 0.9rem;
	}

	.comp-name { font-weight: 600; }
	.comp-count { font-variant-numeric: tabular-nums; }

	.toggle-btn {
		background: none;
		border: 1px solid var(--border);
		border-radius: 4px;
		padding: 0.2rem 0.6rem;
		font-size: 0.8rem;
		color: var(--accent);
		cursor: pointer;
	}
	.toggle-btn:hover { background: var(--accent-light); }

	.files-row td {
		padding: 0.5rem 0.75rem 1rem;
		background: var(--bg);
	}

	.file-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.file-list li {
		font-size: 0.8rem;
		padding: 0.2rem 0;
		color: var(--text-muted);
	}

	.file-list code {
		font-size: 0.8rem;
		color: var(--text);
	}

	.alias {
		font-size: 0.75rem;
		color: var(--accent);
		font-style: italic;
	}

	.hidden { display: none; }

	.empty {
		color: var(--text-muted);
		text-align: center;
		padding: 2rem;
	}

	@media (max-width: 600px) {
		body { padding: 1rem; }
		.bar-label { width: 80px; font-size: 0.75rem; }
		.stats { flex-direction: column; }
	}
`;

// ---------------------------------------------------------------------------
// Inline JS (toggle logic)
// ---------------------------------------------------------------------------

const JS = `
	document.querySelectorAll('[data-toggle]').forEach(btn => {
		btn.addEventListener('click', () => {
			const row = document.getElementById(btn.dataset.toggle);
			const hidden = row.classList.toggle('hidden');
			btn.textContent = hidden ? 'Show files' : 'Hide files';
		});
	});
`;

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function esc(str) {
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
