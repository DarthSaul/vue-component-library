#!/usr/bin/env node

/**
 * build-icons-preview.js
 *
 * Builds a searchable gallery page from one or more already-built SVG sprites.
 * Run it after the sprite build — it reads sprite files, it does not create
 * them.
 *
 * Every icon is rendered from an *embedded* copy of the sprite, so the page
 * works when opened straight off disk. (svg-sprite's own `example: true` page
 * also demos external `<use href="sprite.svg#id">`, which browsers refuse over
 * file:// because each file is its own opaque origin.) Icons render at a
 * uniform size rather than their intrinsic one, so a 16x17 icon and a 56x56
 * icon are directly comparable.
 *
 * Usage:
 *   node utils/build-icons-preview.js dist/sprite/icons-sprite.svg
 *   node utils/build-icons-preview.js dist/a.svg dist/b.svg --out compare.html
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import process from 'node:process';

// ─── CLI ────────────────────────────────────────────────────────────────

const { values: args, positionals: spriteFiles } = parseArgs({
	options: {
		out: { type: 'string', short: 'o' },
		help: { type: 'boolean', short: 'h', default: false },
	},
	allowPositionals: true,
});

if (args.help || spriteFiles.length === 0) {
	console.log(`
Usage: node utils/build-icons-preview.js <sprite.svg> [sprite2.svg ...] [options]

Builds a searchable gallery page from already-built SVG sprites.

Options:
  -o, --out <file>  Output path (default: icons-gallery.html next to the first
                    sprite). Named to avoid clobbering the icons-preview.html
                    that svg-sprite writes when example: true is set.
  -h, --help        Show this help

Paths are resolved relative to the current working directory.
  `);
	process.exit(args.help ? 0 : 1);
}

function fail(message, details = []) {
	console.error(`\n  ${message}\n`);
	for (const detail of details) console.error(`    ${detail}`);
	console.error();
	process.exit(1);
}

// ─── Sprite parsing ─────────────────────────────────────────────────────

/**
 * Pull the symbol ids out of a sprite.
 *
 * Deliberately order-agnostic: svg-sprite emits `<symbol viewBox="…" id="…">`,
 * so a pattern anchored on `id` being the first attribute silently matches
 * nothing and yields an empty gallery.
 */
function findSymbolIds(sprite) {
	return [
		...sprite.matchAll(/<symbol\b[^>]*?\sid\s*=\s*["']([^"']+)["']/g),
	].map((match) => match[1]);
}

/**
 * Namespace every id in a sprite, and every reference to one.
 *
 * Inlining two sprites into one page puts their ids in a single namespace. For
 * the compare-two-builds case they are usually the *same* ids, so without this
 * every `<use>` in the second section resolves to the first sprite's symbol and
 * the comparison silently shows identical icons. Internal ids — gradients, clip
 * paths, masks — collide the same way.
 */
function scopeIds(sprite, prefix) {
	const ids = new Set(
		[...sprite.matchAll(/\sid\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]),
	);

	let out = sprite;

	for (const id of ids) {
		const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

		out = out
			.replace(
				new RegExp(`(\\sid\\s*=\\s*["'])${escaped}(["'])`, 'g'),
				`$1${prefix}${id}$2`,
			)
			.replace(
				new RegExp(`(url\\(\\s*#)${escaped}(\\s*\\))`, 'g'),
				`$1${prefix}${id}$2`,
			)
			.replace(
				new RegExp(`((?:xlink:)?href\\s*=\\s*["']#)${escaped}(["'])`, 'g'),
				`$1${prefix}${id}$2`,
			);
	}

	return out;
}

/** Strip the XML prologue so the sprite can be inlined into an HTML document. */
function stripPrologue(sprite) {
	return sprite
		.replace(/<\?xml[\s\S]*?\?>/gi, '')
		.replace(/<!DOCTYPE[\s\S]*?>/gi, '')
		.trim();
}

function escapeHtml(value) {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

// ─── Read ───────────────────────────────────────────────────────────────

const sections = spriteFiles.map((file, index) => {
	const spritePath = resolve(process.cwd(), file);

	if (!existsSync(spritePath)) {
		fail(`Sprite not found: ${spritePath}`);
	}

	const raw = readFileSync(spritePath, 'utf-8');
	const ids = findSymbolIds(raw);
	const prefix = `s${index}-`;

	return {
		file,
		ids,
		prefix,
		sprite: scopeIds(stripPrologue(raw), prefix),
	};
});

const total = sections.reduce((sum, section) => sum + section.ids.length, 0);

// An empty gallery is almost always a parsing problem rather than an empty
// sprite, so say so instead of writing a page with nothing in it.
for (const section of sections) {
	if (section.ids.length === 0) {
		console.warn(`  ! No <symbol> elements found in ${section.file}`);
	}
}

if (total === 0) {
	fail('No icons found in any sprite — nothing to preview.', [
		'Checked for <symbol id="..."> in:',
		...spriteFiles,
	]);
}

// ─── Render ─────────────────────────────────────────────────────────────

const allSprites = sections.map((section) => section.sprite).join('\n');

const allSections = sections
	.map(
		(section) => `
    <section class="sprite-section">
      <h2>${escapeHtml(section.file)} <span class="count">(${
				section.ids.length
			} icons)</span></h2>
      <div class="icon-grid">${section.ids
				.map(
					(id) => `
        <div class="icon-card">
          <svg class="icon-preview"><use href="#${escapeHtml(
						section.prefix + id,
					)}" /></svg>
          <span class="icon-label">${escapeHtml(id)}</span>
        </div>`,
				)
				.join('')}
      </div>
    </section>`,
	)
	.join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Icon Sprite Preview</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      padding: 2rem;
      background: #f5f5f5;
    }
    h1 { margin-bottom: .5rem; }
    h2 { margin: 2rem 0 1rem; font-size: 1.1rem; color: #555; }
    .count { font-weight: normal; color: #999; }
    .search {
      width: 100%;
      max-width: 400px;
      padding: .5rem .75rem;
      font-size: 1rem;
      border: 1px solid #ccc;
      border-radius: 6px;
      margin-bottom: 1.5rem;
    }
    .icon-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 1rem;
    }
    .icon-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: .5rem;
      padding: 1rem .5rem;
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      transition: border-color .15s;
      min-height: 100px;
    }
    .icon-card:hover { border-color: #333; }
    .icon-card.hidden, .sprite-section.hidden { display: none; }
    .icon-preview {
      width: 32px;
      height: 32px;
      color: #333;
      overflow: visible;
      flex-shrink: 0;
    }
    .icon-label {
      font-size: .65rem;
      color: #666;
      text-align: center;
      word-break: break-all;
    }
    .empty { color: #999; font-size: .85rem; }
    /*
     * Not display:none. Hiding the sprite that way stops gradients, patterns
     * and other paint servers from resolving through <use>, so multi-color
     * icons render blank while flat-filled ones look fine.
     */
    .sprite-host {
      position: absolute;
      width: 0;
      height: 0;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <h1>Icon Sprite Preview</h1>
  <input class="search" type="text" placeholder="Filter icons..." autofocus />
  <p class="empty" hidden>No icons match that filter.</p>

  <div class="sprite-host" aria-hidden="true">
    ${allSprites}
  </div>

  ${allSections}

  <script>
    const search = document.querySelector('.search');
    const cards = [...document.querySelectorAll('.icon-card')];
    const sections = [...document.querySelectorAll('.sprite-section')];
    const empty = document.querySelector('.empty');

    search.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();

      for (const card of cards) {
        const label = card.querySelector('.icon-label').textContent.toLowerCase();
        card.classList.toggle('hidden', !label.includes(q));
      }

      // Hide a sprite's heading once everything under it is filtered out.
      for (const section of sections) {
        const visible = [...section.querySelectorAll('.icon-card')].some(
          (card) => !card.classList.contains('hidden'),
        );
        section.classList.toggle('hidden', !visible);
      }

      empty.hidden = cards.some((card) => !card.classList.contains('hidden'));
    });
  </script>
</body>
</html>`;

// ─── Write ──────────────────────────────────────────────────────────────

// Defaults next to the first sprite, under a name that will not collide with
// the icons-preview.html svg-sprite writes when example: true is set.
const outPath = args.out
	? resolve(process.cwd(), args.out)
	: resolve(dirname(resolve(process.cwd(), spriteFiles[0])), 'icons-gallery.html');

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, html);

console.log(`  Preview generated: ${outPath} (${total} icons)`);
