import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDocgen from 'vite-plugin-vue-docgen'
import markdownToVuePlugin from './markdownToVuePlugin.js'
import { componentMetaPlugin } from './plugins/componentMetaPlugin.js'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [
    vue({ include: /\.(vue|md)$/ }),
    vueDocgen(),
    markdownToVuePlugin(),
    componentMetaPlugin(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000
  }
})
