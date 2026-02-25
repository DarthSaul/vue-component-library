import MarkdownIt from 'markdown-it'
import config from './markdown.config.js'

export default function markdownToVuePlugin() {
  const md = new MarkdownIt(config)
  return {
    name: 'markdown-to-vue',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.md')) return null
      const html = md.render(code)
      return {
        code: `<template><div class="md-content">${html}</div></template>`,
        map: null,
      }
    },
  }
}
