// icons/utils/build-sprite.js
import SVGSpriter from 'svg-sprite';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import fg from 'fast-glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const iconsRoot = resolve(__dirname, '..');

const icons = fg.sync('flat/**/*.svg', { cwd: iconsRoot, absolute: true });

const spriter = new SVGSpriter({
	shape: {
		transform: ['svgo'],
		id: {
			generator: (name) => {
				const stem = basename(name, '.svg');
				return `icon-${stem}`;
			},
		},
	},
	mode: {
		symbol: {
			sprite: 'icons-sprite.svg',
			example: true,
		},
	},
});

for (const file of icons) {
	spriter.add(file, basename(file), readFileSync(file, 'utf-8'));
}

const { result } = await spriter.compileAsync();

const outDir = resolve(iconsRoot, 'dist');
mkdirSync(outDir, { recursive: true });
writeFileSync(
	resolve(outDir, 'icons-sprite.svg'),
	result.symbol.sprite.contents,
);
console.log(
	`Sprite generated: ${resolve(outDir, 'icons-sprite.svg')} (${icons.length} icons)`,
);
