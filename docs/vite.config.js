import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import markdownToVuePlugin from './markdownToVuePlugin.js'

export default defineConfig({
  plugins: [
    vue({ include: /\.(vue|md)$/ }),
    markdownToVuePlugin(),
  ],
  server: {
    port: 3000
  }
})
