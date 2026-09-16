/**
 * detect-colors.js
 *
 * Finds hardcoded fill/stroke colors in SVG markup. Pure and side-effect free
 * — it takes a string and returns findings, so it can back the CLI audit today
 * and a CI lint later.
 *
 * Detected:  hex (#000, #000000), named colors (black, red, …), and the
 *            functional forms rgb() / rgba() / hsl() / hsla().
 * Ignored:   currentColor, none, inherit, transparent, url(#…) references, and
 *            the CSS-wide keywords.
 */

// ─── Color data ─────────────────────────────────────────────────────────

/**
 * The CSS named colors, as name → hex. Used both to recognize a named color
 * and to fold it onto the same canonical value as its hex spelling, so an icon
 * painted `black` in one place and `#000` in another counts as one color.
 */
const CSS_NAMED_COLORS = Object.fromEntries(
	(
		'aliceblue f0f8ff,antiquewhite faebd7,aqua 00ffff,aquamarine 7fffd4,' +
		'azure f0ffff,beige f5f5dc,bisque ffe4c4,black 000000,' +
		'blanchedalmond ffebcd,blue 0000ff,blueviolet 8a2be2,brown a52a2a,' +
		'burlywood deb887,cadetblue 5f9ea0,chartreuse 7fff00,chocolate d2691e,' +
		'coral ff7f50,cornflowerblue 6495ed,cornsilk fff8dc,crimson dc143c,' +
		'cyan 00ffff,darkblue 00008b,darkcyan 008b8b,darkgoldenrod b8860b,' +
		'darkgray a9a9a9,darkgreen 006400,darkgrey a9a9a9,darkkhaki bdb76b,' +
		'darkmagenta 8b008b,darkolivegreen 556b2f,darkorange ff8c00,' +
		'darkorchid 9932cc,darkred 8b0000,darksalmon e9967a,darkseagreen 8fbc8f,' +
		'darkslateblue 483d8b,darkslategray 2f4f4f,darkslategrey 2f4f4f,' +
		'darkturquoise 00ced1,darkviolet 9400d3,deeppink ff1493,' +
		'deepskyblue 00bfff,dimgray 696969,dimgrey 696969,dodgerblue 1e90ff,' +
		'firebrick b22222,floralwhite fffaf0,forestgreen 228b22,fuchsia ff00ff,' +
		'gainsboro dcdcdc,ghostwhite f8f8ff,gold ffd700,goldenrod daa520,' +
		'gray 808080,green 008000,greenyellow adff2f,grey 808080,' +
		'honeydew f0fff0,hotpink ff69b4,indianred cd5c5c,indigo 4b0082,' +
		'ivory fffff0,khaki f0e68c,lavender e6e6fa,lavenderblush fff0f5,' +
		'lawngreen 7cfc00,lemonchiffon fffacd,lightblue add8e6,lightcoral f08080,' +
		'lightcyan e0ffff,lightgoldenrodyellow fafad2,lightgray d3d3d3,' +
		'lightgreen 90ee90,lightgrey d3d3d3,lightpink ffb6c1,lightsalmon ffa07a,' +
		'lightseagreen 20b2aa,lightskyblue 87cefa,lightslategray 778899,' +
		'lightslategrey 778899,lightsteelblue b0c4de,lightyellow ffffe0,' +
		'lime 00ff00,limegreen 32cd32,linen faf0e6,magenta ff00ff,' +
		'maroon 800000,mediumaquamarine 66cdaa,mediumblue 0000cd,' +
		'mediumorchid ba55d3,mediumpurple 9370db,mediumseagreen 3cb371,' +
		'mediumslateblue 7b68ee,mediumspringgreen 00fa9a,mediumturquoise 48d1cc,' +
		'mediumvioletred c71585,midnightblue 191970,mintcream f5fffa,' +
		'mistyrose ffe4e1,moccasin ffe4b5,navajowhite ffdead,navy 000080,' +
		'oldlace fdf5e6,olive 808000,olivedrab 6b8e23,orange ffa500,' +
		'orangered ff4500,orchid da70d6,palegoldenrod eee8aa,palegreen 98fb98,' +
		'paleturquoise afeeee,palevioletred db7093,papayawhip ffefd5,' +
		'peachpuff ffdab9,peru cd853f,pink ffc0cb,plum dda0dd,' +
		'powderblue b0e0e6,purple 800080,rebeccapurple 663399,red ff0000,' +
		'rosybrown bc8f8f,royalblue 4169e1,saddlebrown 8b4513,salmon fa8072,' +
		'sandybrown f4a460,seagreen 2e8b57,seashell fff5ee,sienna a0522d,' +
		'silver c0c0c0,skyblue 87ceeb,slateblue 6a5acd,slategray 708090,' +
		'slategrey 708090,snow fffafa,springgreen 00ff7f,steelblue 4682b4,' +
		'tan d2b48c,teal 008080,thistle d8bfd8,tomato ff6347,' +
		'turquoise 40e0d0,violet ee82ee,wheat f5deb3,white ffffff,' +
		'whitesmoke f5f5f5,yellow ffff00,yellowgreen 9acd32'
	)
		.split(',')
		.map((entry) => {
			const [name, hex] = entry.split(' ');
			return [name, `#${hex}`];
		}),
);

/**
 * Paint values that are explicitly *not* hardcoded colors. `currentColor` is
 * the goal state; the rest are keywords or indirection.
 */
const IGNORED_PAINTS = new Set([
	'none',
	'currentcolor',
	'inherit',
	'transparent',
	'initial',
	'unset',
	'revert',
	'revert-layer',
	'context-fill',
	'context-stroke',
]);

const PAINT_PROPERTIES = new Set(['fill', 'stroke']);

// ─── Color normalization ────────────────────────────────────────────────

function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

function toHexPair(value) {
	return clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
}

/** Parse one rgb()/hsl() argument that may be a number or a percentage. */
function parseComponent(token, scale) {
	const text = token.trim();

	if (text.endsWith('%')) {
		return (Number.parseFloat(text) / 100) * scale;
	}

	return Number.parseFloat(text);
}

/** Split `rgb(…)` / `hsl(…)` arguments, accepting comma or space/slash syntax. */
function splitArguments(body) {
	return body
		.replace(/\//g, ' ')
		.split(/[\s,]+/)
		.map((token) => token.trim())
		.filter(Boolean);
}

function hslToRgb(hue, saturation, lightness) {
	const h = ((hue % 360) + 360) % 360;
	const s = clamp(saturation, 0, 1);
	const l = clamp(lightness, 0, 1);

	const c = (1 - Math.abs(2 * l - 1)) * s;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = l - c / 2;

	const [r, g, b] =
		h < 60
			? [c, x, 0]
			: h < 120
				? [x, c, 0]
				: h < 180
					? [0, c, x]
					: h < 240
						? [0, x, c]
						: h < 300
							? [x, 0, c]
							: [c, 0, x];

	return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function parseHue(token) {
	const text = token.trim().toLowerCase();
	const value = Number.parseFloat(text);

	if (text.endsWith('turn')) return value * 360;
	if (text.endsWith('rad')) return (value * 180) / Math.PI;
	if (text.endsWith('grad')) return value * 0.9;

	return value;
}

/**
 * Fold a paint value onto a canonical `#rrggbb` / `#rrggbbaa` form.
 *
 * Returns `null` when the value is not a hardcoded color — either because it
 * is an ignored keyword, a url() reference, or something unrecognized.
 */
export function normalizeColor(rawValue) {
	const value = String(rawValue).trim();
	const lower = value.toLowerCase();

	if (!value) return null;
	if (IGNORED_PAINTS.has(lower)) return null;
	if (lower.startsWith('url(')) return null;

	if (CSS_NAMED_COLORS[lower]) {
		return { hex: CSS_NAMED_COLORS[lower], kind: 'named' };
	}

	const hex = lower.match(/^#([0-9a-f]{3,8})$/);

	if (hex) {
		const digits = hex[1];

		// #rgb and #rgba expand by doubling each digit.
		if (digits.length === 3 || digits.length === 4) {
			const expanded = [...digits].map((digit) => digit + digit).join('');
			return {
				hex: `#${expanded.length === 8 && expanded.endsWith('ff') ? expanded.slice(0, 6) : expanded}`,
				kind: 'hex',
			};
		}

		if (digits.length === 6) return { hex: `#${digits}`, kind: 'hex' };

		if (digits.length === 8) {
			return {
				hex: `#${digits.endsWith('ff') ? digits.slice(0, 6) : digits}`,
				kind: 'hex',
			};
		}

		return null;
	}

	const functional = lower.match(/^(rgba?|hsla?)\(([^)]*)\)$/);

	if (functional) {
		const [, fn, body] = functional;
		const parts = splitArguments(body);

		if (parts.length < 3) return null;

		let rgb;

		if (fn.startsWith('rgb')) {
			rgb = [
				parseComponent(parts[0], 255),
				parseComponent(parts[1], 255),
				parseComponent(parts[2], 255),
			];
		} else {
			rgb = hslToRgb(
				parseHue(parts[0]),
				parseComponent(parts[1], 1),
				parseComponent(parts[2], 1),
			);
		}

		if (rgb.some((channel) => Number.isNaN(channel))) return null;

		let suffix = '';

		if (parts.length >= 4) {
			const alpha = parseComponent(parts[3], 1);

			if (!Number.isNaN(alpha) && alpha < 1) {
				suffix = toHexPair(clamp(alpha, 0, 1) * 255);
			}
		}

		return { hex: `#${rgb.map(toHexPair).join('')}${suffix}`, kind: 'functional' };
	}

	return null;
}

// ─── Markup walking ─────────────────────────────────────────────────────

// Matches one element's open tag, tolerating `>` inside quoted attributes.
const TAG_PATTERN = /<([a-zA-Z][\w.:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
const ATTRIBUTE_PATTERN =
	/([a-zA-Z_:][\w.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

/** Split an inline `style="…"` value into property/value pairs. */
function parseStyleDeclarations(style) {
	return style
		.split(';')
		.map((declaration) => {
			const index = declaration.indexOf(':');

			if (index === -1) return null;

			return {
				property: declaration.slice(0, index).trim().toLowerCase(),
				value: declaration.slice(index + 1).trim(),
			};
		})
		.filter(Boolean);
}

/**
 * Every place this file paints something, whether via a presentation attribute
 * or an inline style declaration.
 */
function collectPaintSites(source) {
	// Comments can contain anything, including markup that was commented out.
	const markup = source.replace(/<!--[\s\S]*?-->/g, '');
	const sites = [];

	for (const tag of markup.matchAll(TAG_PATTERN)) {
		const element = tag[1];
		const attributeBlob = tag[2] ?? '';

		for (const attribute of attributeBlob.matchAll(ATTRIBUTE_PATTERN)) {
			const name = attribute[1].toLowerCase();
			const value = attribute[2] ?? attribute[3] ?? '';

			if (PAINT_PROPERTIES.has(name)) {
				sites.push({ element, attribute: name, via: 'attribute', value });
				continue;
			}

			if (name === 'style') {
				for (const declaration of parseStyleDeclarations(value)) {
					if (!PAINT_PROPERTIES.has(declaration.property)) continue;

					sites.push({
						element,
						attribute: declaration.property,
						via: 'style',
						value: declaration.value,
					});
				}
			}
		}
	}

	return { sites, markup };
}

// ─── Public API ─────────────────────────────────────────────────────────

export const CLASSIFICATIONS = {
	OK: 'ok',
	SINGLE: 'single-color-hardcoded',
	MULTI: 'multi-color',
};

/**
 * Audit one SVG's markup.
 *
 * Distinctness is measured on the *normalized* color, so `#000`, `#000000` and
 * `black` collapse to one color. Without that, a mono-color icon that spells
 * black two different ways would be misfiled as `multi-color` and wrongly
 * excluded from currentColor conversion.
 *
 * @param {string} source Raw SVG markup.
 * @returns {{classification: string, colors: Array, warnings: Array}}
 */
export function detectColors(source) {
	const { sites, markup } = collectPaintSites(source);
	const byColor = new Map();
	const warnings = [];

	for (const site of sites) {
		const normalized = normalizeColor(site.value);

		if (!normalized) {
			const lower = site.value.trim().toLowerCase();

			// Not a keyword we know and not parseable as a color — most likely a
			// typo or a CSS variable. Surface it instead of silently passing.
			if (
				lower &&
				!IGNORED_PAINTS.has(lower) &&
				!lower.startsWith('url(')
			) {
				warnings.push({
					type: 'unrecognized-paint',
					element: site.element,
					attribute: site.attribute,
					via: site.via,
					value: site.value,
				});
			}

			continue;
		}

		if (!byColor.has(normalized.hex)) {
			byColor.set(normalized.hex, {
				color: normalized.hex,
				kind: normalized.kind,
				raw: new Set(),
				occurrences: [],
			});
		}

		const entry = byColor.get(normalized.hex);

		entry.raw.add(site.value.trim());
		entry.occurrences.push({
			element: site.element,
			attribute: site.attribute,
			via: site.via,
			value: site.value.trim(),
		});
	}

	// A <style> block can repaint anything, and this audit only reads
	// attributes and inline styles. Say so rather than implying full coverage.
	if (/<style[\s>]/i.test(markup)) {
		warnings.push({
			type: 'style-block',
			message:
				'File contains a <style> block; CSS rules inside it are not audited.',
		});
	}

	const colors = [...byColor.values()]
		.sort((a, b) => a.color.localeCompare(b.color))
		.map((entry) => ({
			color: entry.color,
			kind: entry.kind,
			raw: [...entry.raw].sort(),
			occurrences: entry.occurrences,
		}));

	let classification = CLASSIFICATIONS.OK;

	if (colors.length === 1) classification = CLASSIFICATIONS.SINGLE;
	else if (colors.length > 1) classification = CLASSIFICATIONS.MULTI;

	return { classification, colors, warnings };
}
