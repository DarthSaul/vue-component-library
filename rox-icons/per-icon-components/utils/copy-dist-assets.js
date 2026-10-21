// icons/utils/copy-dist-assets.js
// Copies hand-written and generated .d.ts files into dist/lib/, mirroring the
// source tree the same way the Vite build does for the .mjs files.
import { cpSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist/lib');
const onlyTypes = (src) => !src.includes('.') || src.endsWith('.d.ts');

cpSync(resolve(root, 'src'), resolve(dist, 'src'), {
	recursive: true,
	filter: (src) => onlyTypes(src) && !src.includes('__tests__'),
});
cpSync(resolve(root, 'generated'), resolve(dist, 'generated'), {
	recursive: true,
	filter: onlyTypes,
});
