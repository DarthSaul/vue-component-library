// icons/utils/build-preview.js
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsRoot = resolve(__dirname, '..');

const spriteFiles = process.argv.slice(2);

if (spriteFiles.length === 0) {
	console.error(
		'Usage: node utils/build-preview.js dist/icons.svg [dist/icons2.svg ...]',
	);
	process.exit(1);
}

const sections = spriteFiles.map((file) => {
	const spritePath = resolve(iconsRoot, file);
	const spriteContent = readFileSync(spritePath, 'utf-8');

	const symbolIds = [
		...spriteContent.matchAll(/<symbol\s+id="([^"]+)"/g),
	].map((m) => m[1]);

	const cards = symbolIds
		.map(
			(id) => `
      <div class="icon-card">
        <svg class="icon-preview"><use href="#${id}" /></svg>
        <span class="icon-label">${id}</span>
      </div>`,
		)
		.join('\n');

	return { file, spriteContent, cards, count: symbolIds.length };
});

const allSprites = sections.map((s) => s.spriteContent).join('\n');
const allSections = sections
	.map(
		(s) => `
    <h2>${s.file} <span class="count">(${s.count} icons)</span></h2>
    <div class="icon-grid">${s.cards}</div>`,
	)
	.join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
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
    .icon-card.hidden { display: none; }
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
  </style>
</head>
<body>
  <h1>Icon Sprite Preview</h1>
  <input class="search" type="text" placeholder="Filter icons..." autofocus />

  <div style="display:none" aria-hidden="true">
    ${allSprites}
  </div>

  ${allSections}

  <script>
    document.querySelector('.search').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('.icon-card').forEach((card) => {
        const label = card.querySelector('.icon-label').textContent.toLowerCase();
        card.classList.toggle('hidden', !label.includes(q));
      });
    });
  </script>
</body>
</html>`;

const outPath = resolve(iconsRoot, 'dist', 'icons-preview.html');
writeFileSync(outPath, html);
console.log(
	`Preview generated: ${outPath} (${sections.reduce((n, s) => n + s.count, 0)} total icons)`,
);
