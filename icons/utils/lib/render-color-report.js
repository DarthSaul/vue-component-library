/**
 * render-color-report.js
 *
 * Renders the color audit as a standalone HTML page. Kept out of the CLI so
 * color-audit.js stays a thin wrapper, and pure like detect-colors.js — it
 * takes data and returns a string.
 *
 * Icons are inlined rather than linked so the page is a single file that can be
 * opened, moved or shared without dragging the icon directory along.
 */

const CLASSIFICATION_LABELS = {
	'single-color-hardcoded': {
		title: 'Single color — convert to currentColor',
		badge: 'SINGLE',
		tone: 'single',
		lede: 'One distinct color across the file. These are the currentColor conversion batch.',
	},
	'multi-color': {
		title: 'Multi color — leave alone',
		badge: 'MULTI',
		tone: 'multi',
		lede: 'More than one distinct color, assumed intentional. Not candidates for conversion.',
	},
	ok: {
		title: 'OK — no hardcoded colors',
		badge: 'OK',
		tone: 'ok',
		lede: 'Already using currentColor, none, or url() references only. Nothing to do.',
	},
};

const SECTION_ORDER = ['single-color-hardcoded', 'multi-color', 'ok'];

function escapeHtml(value) {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function plural(count, noun) {
	return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/**
 * Namespace an SVG's internal identifiers before inlining it.
 *
 * Dropping many icons into one document makes their ids and class names share a
 * global namespace. Exported SVGs collide constantly — `id="a"`, `id="Layer_1"`,
 * `.st0 { fill: … }` — and the second icon's gradients, clip paths and CSS rules
 * would silently resolve against the first one's.
 */
function scopeSvg(svg, prefix) {
	let out = svg;

	// ── ids, and every way they get referenced ──
	const ids = new Set(
		[...out.matchAll(/\sid\s*=\s*"([^"]+)"/g)].map((match) => match[1]),
	);

	for (const id of ids) {
		const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

		out = out
			.replace(new RegExp(`(\\sid\\s*=\\s*")${escaped}(")`, 'g'), `$1${prefix}${id}$2`)
			// Covers fill, stroke, clip-path, mask, filter — anything url()-based.
			.replace(new RegExp(`(url\\(\\s*#)${escaped}(\\s*\\))`, 'g'), `$1${prefix}${id}$2`)
			.replace(
				new RegExp(`((?:xlink:)?href\\s*=\\s*"#)${escaped}(")`, 'g'),
				`$1${prefix}${id}$2`,
			);
	}

	// ── class names, when the icon carries its own <style> block ──
	if (/<style[\s>]/i.test(out)) {
		const classes = new Set();

		for (const match of out.matchAll(/\sclass\s*=\s*"([^"]*)"/g)) {
			for (const name of match[1].split(/\s+/).filter(Boolean)) {
				classes.add(name);
			}
		}

		// Selectors defined in the style block but never referenced by a class
		// attribute still need renaming, or they would leak onto other icons.
		for (const block of out.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
			for (const selector of block[1].matchAll(/\.([A-Za-z_][\w-]*)/g)) {
				classes.add(selector[1]);
			}
		}

		for (const name of classes) {
			const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

			// `.st0` in CSS — the [A-Za-z_] guard keeps this off decimals like 0.5.
			out = out.replace(
				new RegExp(`\\.${escaped}\\b`, 'g'),
				`.${prefix}${name}`,
			);
		}

		out = out.replace(/\sclass\s*=\s*"([^"]*)"/g, (whole, value) => {
			const scoped = value
				.split(/\s+/)
				.filter(Boolean)
				.map((name) => `${prefix}${name}`)
				.join(' ');

			return ` class="${scoped}"`;
		});
	}

	return out;
}

/** Strip the XML prologue so the markup can sit inside an HTML document. */
function inlineSvg(source, prefix) {
	const stripped = source
		.replace(/<\?xml[\s\S]*?\?>/gi, '')
		.replace(/<!DOCTYPE[\s\S]*?>/gi, '')
		.trim();

	return scopeSvg(stripped, prefix);
}

function renderSwatches(colors) {
	if (colors.length === 0) {
		return '<p class="muted small">No hardcoded colors.</p>';
	}

	return `<ul class="colors">${colors
		.map(
			(entry) => `
					<li>
						<span class="swatch" style="background:${escapeHtml(entry.color)}"></span>
						<code>${escapeHtml(entry.color)}</code>
						${
							entry.raw.length > 1 ||
							entry.raw[0]?.toLowerCase() !== entry.color
								? `<span class="muted small">${escapeHtml(
										entry.raw.join(', '),
									)}</span>`
								: ''
						}
						<span class="muted small occ">${escapeHtml(
							entry.occurrences
								.map((o) => `${o.element}.${o.attribute}${o.via === 'style' ? ' (style)' : ''}`)
								.join(', '),
						)}</span>
					</li>`,
		)
		.join('')}
				</ul>`;
}

function renderWarnings(warnings) {
	if (!warnings || warnings.length === 0) return '';

	return `<ul class="warnings">${warnings
		.map((warning) => {
			const text =
				warning.type === 'style-block'
					? '&lt;style&gt; block — CSS rules not audited'
					: `unrecognized paint ${escapeHtml(warning.value)} on ${escapeHtml(
							`${warning.element}.${warning.attribute}`,
						)}`;

			return `<li>${text}</li>`;
		})
		.join('')}
				</ul>`;
}

function renderCard(icon, index) {
	const hasWarnings = (icon.warnings ?? []).length > 0;
	const label = CLASSIFICATION_LABELS[icon.classification];

	return `
				<article class="card" data-class="${escapeHtml(
					icon.classification,
				)}" data-warn="${hasWarnings}">
					<div class="art">${inlineSvg(icon.source, `i${index}-`)}</div>
					<div class="meta">
						<code class="filename">${escapeHtml(icon.path)}</code>
						<span class="badge ${label.tone}">${label.badge}</span>
						${hasWarnings ? '<span class="badge warn">WARN</span>' : ''}
						${renderSwatches(icon.colors)}
						${renderWarnings(icon.warnings)}
					</div>
				</article>`;
}

/**
 * @param {object} data
 * @param {string} data.generatedAt ISO timestamp.
 * @param {string} data.source Display path of the icon directory.
 * @param {object} data.summary Counts per classification.
 * @param {Array} data.icons Every icon, each with { path, classification,
 *   colors, warnings, source } — including `ok` ones, which the JSON omits.
 * @returns {string} A standalone HTML document.
 */
export function renderColorReport({ generatedAt, source, summary, icons }) {
	const byClassification = new Map(
		SECTION_ORDER.map((classification) => [classification, []]),
	);

	icons.forEach((icon, index) => {
		byClassification.get(icon.classification)?.push(renderCard(icon, index));
	});

	const sections = SECTION_ORDER.map((classification) => {
		const cards = byClassification.get(classification) ?? [];

		if (cards.length === 0) return '';

		const label = CLASSIFICATION_LABELS[classification];

		return `
		<section data-section="${escapeHtml(classification)}">
			<h2><span class="badge ${label.tone}">${label.badge}</span> ${escapeHtml(
				label.title,
			)} <span class="count">${cards.length}</span></h2>
			<p class="lede">${escapeHtml(label.lede)}</p>
			<div class="grid">${cards.join('')}
			</div>
		</section>`;
	}).join('');

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Icon color audit</title>
<style>
	:root {
		--bg: #ffffff;
		--panel: #f6f7f9;
		--border: #d8dce3;
		--text: #14171c;
		--muted: #6b7280;
		--art-bg: #ffffff;
	}
	[data-theme="dark"] {
		--bg: #14171c;
		--panel: #1d2128;
		--border: #333a45;
		--text: #e8eaed;
		--muted: #9aa3b2;
		--art-bg: #14171c;
	}
	* { box-sizing: border-box; }
	body {
		margin: 0;
		padding: 24px;
		background: var(--bg);
		color: var(--text);
		font: 14px/1.5 ui-sans-serif, system-ui, -apple-system, sans-serif;
	}
	h1 { font-size: 20px; margin: 0 0 4px; }
	h2 {
		font-size: 15px;
		margin: 0 0 4px;
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.sub { color: var(--muted); margin: 0 0 16px; }
	.lede { margin: 0 0 12px; color: var(--muted); }
	.small { font-size: 11px; }
	.muted { color: var(--muted); }
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
		margin-bottom: 20px;
		position: sticky;
		top: 0;
		background: var(--bg);
		padding: 8px 0;
		z-index: 2;
	}
	button {
		font: inherit;
		font-size: 13px;
		padding: 5px 11px;
		border-radius: 6px;
		border: 1px solid var(--border);
		background: var(--panel);
		color: var(--text);
		cursor: pointer;
	}
	button[aria-pressed="true"] { background: #2563eb; border-color: #2563eb; color: #fff; }
	section {
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 16px;
		margin-bottom: 16px;
		background: var(--panel);
	}
	.badge {
		font-size: 10px;
		letter-spacing: .04em;
		padding: 2px 7px;
		border-radius: 999px;
		color: #fff;
		white-space: nowrap;
	}
	.badge.single { background: #9a6300; }
	.badge.multi { background: #6d28d9; }
	.badge.ok { background: #15803d; }
	.badge.warn { background: #b4232b; }
	.count {
		font-size: 12px;
		color: var(--muted);
		border: 1px solid var(--border);
		border-radius: 999px;
		padding: 0 8px;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
		gap: 12px;
	}
	.card {
		display: flex;
		gap: 12px;
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 10px;
		background: var(--bg);
	}
	.art {
		flex: 0 0 auto;
		display: grid;
		place-items: center;
		width: 64px;
		height: 64px;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--art-bg);
		color: var(--text);
		overflow: hidden;
	}
	/* Beats width/height presentation attributes on the source SVG. */
	.art svg { width: 40px; height: 40px; display: block; }
	.meta { min-width: 0; }
	.filename { font-size: 11px; word-break: break-all; display: block; margin-bottom: 4px; }
	.colors { list-style: none; margin: 6px 0 0; padding: 0; }
	.colors li {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
		align-items: center;
		font-size: 11px;
		margin-bottom: 2px;
	}
	.occ { flex-basis: 100%; }
	.swatch {
		width: 11px;
		height: 11px;
		border-radius: 2px;
		border: 1px solid var(--border);
		display: inline-block;
		flex: 0 0 auto;
	}
	.warnings {
		list-style: none;
		margin: 6px 0 0;
		padding: 0;
		font-size: 11px;
		color: #b4232b;
	}
	[data-theme="dark"] .warnings { color: #fca5a5; }
	code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
</style>
</head>
<body>
	<h1>Icon color audit</h1>
	<p class="sub">${escapeHtml(source)} &middot; ${plural(
		summary.totalIcons,
		'icon',
	)} &middot; generated ${escapeHtml(generatedAt)}</p>

	<div class="toolbar">
		<button type="button" data-filter="attention" aria-pressed="true">Needs attention</button>
		<button type="button" data-filter="single-color-hardcoded" aria-pressed="false">Single (${
			summary.singleColorHardcoded
		})</button>
		<button type="button" data-filter="multi-color" aria-pressed="false">Multi (${
			summary.multiColor
		})</button>
		<button type="button" data-filter="warn" aria-pressed="false">Warnings (${
			summary.warnings
		})</button>
		<button type="button" data-filter="ok" aria-pressed="false">OK (${
			summary.ok
		})</button>
		<button type="button" data-filter="all" aria-pressed="false">All</button>
		<button type="button" id="theme">Toggle background</button>
	</div>
	${sections || '<section><p class="lede">No icons found.</p></section>'}
	<script>
		const cards = [...document.querySelectorAll('.card')];
		const sections = [...document.querySelectorAll('section[data-section]')];
		const buttons = [...document.querySelectorAll('[data-filter]')];

		function matches(card, filter) {
			if (filter === 'all') return true;
			if (filter === 'attention') return card.dataset.class !== 'ok';
			if (filter === 'warn') return card.dataset.warn === 'true';
			return card.dataset.class === filter;
		}

		function apply(filter) {
			for (const card of cards) {
				card.hidden = !matches(card, filter);
			}

			// Hide a section once everything inside it is filtered out.
			for (const section of sections) {
				section.hidden = ![...section.querySelectorAll('.card')].some(
					(card) => !card.hidden,
				);
			}

			for (const button of buttons) {
				button.setAttribute(
					'aria-pressed',
					String(button.dataset.filter === filter),
				);
			}
		}

		for (const button of buttons) {
			button.addEventListener('click', () => apply(button.dataset.filter));
		}

		const root = document.documentElement;
		document.getElementById('theme').addEventListener('click', () => {
			root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
		});

		apply('attention');
	</script>
</body>
</html>
`;
}
