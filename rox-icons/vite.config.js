// icons/vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
	build: {
		outDir: 'dist',
		emptyOutDir: true,
		lib: { entry: 'src/index.js', formats: ['es'], fileName: () => 'index.js' },
	},
});
