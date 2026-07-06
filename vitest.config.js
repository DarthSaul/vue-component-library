import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

// Scoped to the standalone Plaid IAV reference implementation under plaid/.
// `@ds/vue` isn't a real dependency here, so it's aliased to a local stub
// (see plaid/tests/stubs/ds-vue.js).
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@ds/vue': fileURLToPath(
        new URL('./plaid/tests/stubs/ds-vue.js', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['plaid/**/*.spec.js'],
  },
});
