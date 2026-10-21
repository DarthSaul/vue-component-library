import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const root = fileURLToPath(new URL('.', import.meta.url));

// @roxbury/icons and @roxbury/icons/<name> are never bundled into ui/dist.
// They're emitted as imports of the public specifier, so the icon code lives
// once, in icons/dist, and consumers' bundlers tree-shake it.
const ICONS = /^@roxbury\/icons(\/.*)?$/;

export default defineConfig({
	plugins: [vue()],
	build: {
		outDir: 'dist',
		lib: { entry: resolve(root, 'src/index.js'), formats: ['es'], fileName: () => 'index.mjs' },
		rollupOptions: {
			external: ['vue', ICONS],
			output: {
				paths: (id) => (ICONS.test(id) ? id.replace('@roxbury/icons', '@cnodigital/roxbury/icons') : id),
			},
		},
	},
});
