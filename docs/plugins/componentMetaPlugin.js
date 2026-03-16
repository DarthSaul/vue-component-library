import { createChecker } from 'vue-component-meta'
import { resolve } from 'path'

const COMPONENTS = {
  Alert:      'ui/src/components/Alert/Alert.vue',
  Button:     'ui/src/components/Button/Button.vue',
  ButtonBase: 'ui/src/components/Button/ButtonBase.vue',
  Card:       'ui/src/components/Card/Card.vue',
  Input:      'ui/src/components/Input/Input.vue',
  InputBase:  'ui/src/components/Input/InputBase.vue',
}

export function componentMetaPlugin() {
  const virtualModuleId = 'virtual:component-meta'
  const resolved = '\0' + virtualModuleId
  let cache = null

  return {
    name: 'vite-plugin-component-meta',
    resolveId(id) {
      if (id === virtualModuleId) return resolved
    },
    load(id) {
      if (id !== resolved) return
      if (cache) return cache

      const root = resolve('.')
      const checker = createChecker(resolve(root, 'jsconfig.json'))
      const meta = {}
      for (const [name, relPath] of Object.entries(COMPONENTS)) {
        try {
          meta[name] = checker.getComponentMeta(resolve(root, relPath))
        } catch (e) {
          console.warn(`[component-meta] Failed to extract meta for ${name}:`, e.message)
          meta[name] = { props: [], events: [], slots: [], exposed: [] }
        }
      }
      cache = `export default ${JSON.stringify(meta, null, 2)}`
      return cache
    },
  }
}
