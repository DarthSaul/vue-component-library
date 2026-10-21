// icons/vite.config.js
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
	build: {
		outDir: 'dist/lib',
		emptyOutDir: true,
		lib: {
			entry: resolve(root, 'src/index.js'),
			formats: ['es'],
		},
		rollupOptions: {
			external: ['vue'],
			output: {
				// One output file per source file, mirroring the source tree, so
				// every icon is its own module (tree-shaking and per-icon import
				// paths) and relative imports in the .d.ts files stay valid.
				preserveModules: true,
				preserveModulesRoot: root,
				entryFileNames: '[name].mjs',
			},
		},
	},
});
