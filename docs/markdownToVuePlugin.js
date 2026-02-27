import MarkdownIt from 'markdown-it'
import config from './markdown.config.js'

export default function markdownToVuePlugin() {
  const md = new MarkdownIt(config)
  return {
    name: 'markdown-to-vue',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.md')) return null

      let scriptBlock = ''
      let markdownSource = code

      const scriptMatch = code.match(/^(<script\s+setup[^>]*>[\s\S]*?<\/script>)\n?/)
      if (scriptMatch) {
        scriptBlock = scriptMatch[1]
        markdownSource = code.slice(scriptMatch[0].length)
      }

      const html = md.render(markdownSource)
      return {
        code: `${scriptBlock}\n<template><div class="md-content">${html}</div></template>`,
        map: null,
      }
    },
  }
}
