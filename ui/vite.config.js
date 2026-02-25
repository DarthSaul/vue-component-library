import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDocgen from 'vite-plugin-vue-docgen'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [vue(), vueDocgen()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'VueComponentLibrary',
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: {
          vue: 'Vue'
        },
        dir: '../dist'
      }
    }
  }
})
