import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  // Serve files from report-data/ at the root of the dev server.
  // Place report JSON files there and the app will fetch them at e.g. /report.json
  publicDir: '../report-data',
  server: {
    port: 5173,
  },
});
